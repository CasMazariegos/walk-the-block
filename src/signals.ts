export const SIGNAL_CATALOG = [
  { id: 'tarp_roof', label: 'Tarp or damaged roof' },
  { id: 'overgrown_yard', label: 'Overgrown yard' },
  { id: 'boarded_windows', label: 'Boarded windows' },
  { id: 'peeling_paint', label: 'Peeling paint' },
  { id: 'piled_mail', label: 'Piled mail or notices' },
  { id: 'junk_debris', label: 'Junk or debris' },
  { id: 'broken_fence', label: 'Broken fence' },
  { id: 'vacant_look', label: 'Vacant look' },
] as const

export type SignalId = (typeof SIGNAL_CATALOG)[number]['id']

export interface SignalHit {
  id: SignalId
  label: string
  present: boolean
  evidence: string
}

const LABEL_BY_ID: Record<SignalId, string> = Object.fromEntries(
  SIGNAL_CATALOG.map((signal) => [signal.id, signal.label]),
) as Record<SignalId, string>

const ALIAS: Record<string, SignalId> = {
  tarp_roof: 'tarp_roof',
  tarp: 'tarp_roof',
  roof: 'tarp_roof',
  damaged_roof: 'tarp_roof',
  damagedroof: 'tarp_roof',
  overgrown_yard: 'overgrown_yard',
  overgrown: 'overgrown_yard',
  yard: 'overgrown_yard',
  boarded_windows: 'boarded_windows',
  boarded: 'boarded_windows',
  boards: 'boarded_windows',
  peeling_paint: 'peeling_paint',
  peeling: 'peeling_paint',
  paint: 'peeling_paint',
  piled_mail: 'piled_mail',
  mail: 'piled_mail',
  notices: 'piled_mail',
  junk_debris: 'junk_debris',
  junk: 'junk_debris',
  debris: 'junk_debris',
  broken_fence: 'broken_fence',
  fence: 'broken_fence',
  vacant_look: 'vacant_look',
  vacant: 'vacant_look',
}

export function signalLabel(id: SignalId): string {
  return LABEL_BY_ID[id]
}

export function normalizeSignalId(raw: string): SignalId | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return ALIAS[key] ?? null
}

export function blankSignals(): SignalHit[] {
  return SIGNAL_CATALOG.map((signal) => ({
    id: signal.id,
    label: signal.label,
    present: false,
    evidence: '',
  }))
}

export function presentSignals(signals: SignalHit[]): SignalHit[] {
  return signals.filter((signal) => signal.present)
}
