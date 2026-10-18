import { ANALYSIS_PROMPT } from './prompt'
import {
  blankSignals,
  normalizeSignalId,
  signalLabel,
  type SignalHit,
  type SignalId,
} from './signals'
import type { Analysis } from './types'

export { ANALYSIS_PROMPT }

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function clipBlock(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n/g, '\n').trim().slice(0, max)
}

function asPresent(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const word = value.trim().toLowerCase()
    return word === 'true' || word === 'yes' || word === 'present' || word === '1'
  }
  return false
}

function clampScore(value: unknown): number {
  let score = typeof value === 'string' ? Number(value.trim()) : Number(value)
  if (!Number.isFinite(score)) return 0
  if (score > 0 && score <= 1) score *= 100
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function extractJsonObject(raw: string): unknown {
  let text = raw.trim()
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('The model did not return a JSON object.')
  }
  let slice = text.slice(start, end + 1)
  slice = slice.replace(/,\s*([}\]])/g, '$1')
  try {
    return JSON.parse(slice)
  } catch {
    throw new Error('The model returned JSON that could not be read. Try the photo again.')
  }
}

function readSignalEntry(entry: unknown): { id: SignalId; present: boolean; evidence: string } | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as Record<string, unknown>
  const idRaw = record.id ?? record.name ?? record.signal ?? record.label
  if (typeof idRaw !== 'string') return null
  const id = normalizeSignalId(idRaw)
  if (!id) return null
  const present = asPresent(record.present ?? record.found ?? record.visible ?? record.value)
  const evidence = present ? clip(record.evidence ?? record.note ?? record.detail, 180) : ''
  return { id, present, evidence }
}

function applySignals(raw: unknown): SignalHit[] {
  const hits = blankSignals()
  const byId = new Map(hits.map((hit) => [hit.id, hit]))

  const entries: unknown[] = []
  if (Array.isArray(raw)) {
    entries.push(...raw)
  } else if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        entries.push({ id: key, ...(value as Record<string, unknown>) })
      } else {
        entries.push({ id: key, present: value })
      }
    }
  }

  for (const entry of entries) {
    const parsed = readSignalEntry(entry)
    if (!parsed) continue
    const hit = byId.get(parsed.id)
    if (!hit) continue
    hit.present = parsed.present
    hit.evidence = parsed.evidence
    hit.label = signalLabel(parsed.id)
  }
  return hits
}

export function parseAnalysis(raw: string): Analysis {
  const json = extractJsonObject(raw)
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('The model returned JSON in an unexpected shape.')
  }
  const record = json as Record<string, unknown>
  const signals = applySignals(record.signals ?? record.visibleSignals ?? record.signal)
  const found = signals.filter((signal) => signal.present).map((signal) => signal.label)
  let reason = clip(record.reason ?? record.summary, 220)
  if (!reason) {
    reason = found.length
      ? `Visible: ${found.join(', ')}.`
      : 'No clear distress signals in this photo.'
  }
  let confidence = clip(record.confidence ?? record.confidenceNote, 280)
  if (!confidence) {
    confidence = 'The model did not describe how clear the photo was.'
  }
  return {
    distressScore: clampScore(record.distressScore ?? record.score ?? record.distress),
    signals,
    confidence,
    reason,
    letterEn: clipBlock(record.letterEn ?? record.letter_en ?? record.postcardEn, 1200),
    letterEs: clipBlock(record.letterEs ?? record.letter_es ?? record.postcardEs, 1200),
  }
}
