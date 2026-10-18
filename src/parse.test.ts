import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { parseAnalysis } from './parse'
import { ANALYSIS_PROMPT, modelLikelyTextOnly } from './prompt'
import { ollamaRequestBody, studioRequestBody } from './backends'
import { mixedContentRisk, normalizeOllamaUrl } from './models'
import { SAMPLES, sampleSignals } from './samples'
import { presentSignals } from './signals'

const CLEAN = `{
  "distressScore": "74",
  "signals": [
    {"id": "boarded_windows", "present": true, "evidence": "Plywood covers the front windows."},
    {"id": "tarp_roof", "present": "no", "evidence": "should be dropped"}
  ],
  "confidence": "Front facade, midday light.",
  "reason": "Boards cover the front windows.",
  "letterEn": "Hello {{name}}\\nCall {{phone}}",
  "letterEs": "Hola {{name}}"
}`

describe('parseAnalysis', () => {
  it('reads a fenced reply with a string score and drops evidence for absent signals', () => {
    const analysis = parseAnalysis(`Sure — here is the JSON:\n\`\`\`json\n${CLEAN}\n\`\`\`\n`)
    expect(analysis.distressScore).toBe(74)
    expect(analysis.reason).toBe('Boards cover the front windows.')
    const boarded = analysis.signals.find((signal) => signal.id === 'boarded_windows')
    const tarp = analysis.signals.find((signal) => signal.id === 'tarp_roof')
    expect(boarded).toMatchObject({ present: true, evidence: 'Plywood covers the front windows.' })
    expect(tarp).toMatchObject({ present: false, evidence: '' })
    expect(analysis.signals).toHaveLength(8)
    expect(analysis.letterEn).toContain('{{phone}}')
    expect(analysis.letterEn).toContain('\n')
  })

  it('repairs a trailing comma and a 0-1 score', () => {
    const analysis = parseAnalysis('{"distressScore": 0.8, "signals": {"overgrown_yard": {"present": true, "evidence": "Weeds cover the lawn."}},}')
    expect(analysis.distressScore).toBe(80)
    expect(presentSignals(analysis.signals).map((signal) => signal.id)).toEqual(['overgrown_yard'])
  })

  it('builds a reason when the model omits one', () => {
    const analysis = parseAnalysis('{"score": 140, "signals": [{"label": "Piled mail", "found": true, "note": "A stack of papers sits on the step."}]}')
    expect(analysis.distressScore).toBe(100)
    expect(analysis.reason).toBe('Visible: Piled mail or notices.')
    expect(analysis.confidence.length).toBeGreaterThan(0)
  })

  it('rejects prose with no object', () => {
    expect(() => parseAnalysis('I cannot tell from this photo.')).toThrow(/JSON object/)
  })
})

describe('prompt and request bodies', () => {
  it('asks for visible facts only and every signal id', () => {
    expect(ANALYSIS_PROMPT).toMatch(/Do not guess/)
    expect(ANALYSIS_PROMPT).toMatch(/owner or occupants/)
    for (const id of ['tarp_roof', 'overgrown_yard', 'boarded_windows', 'peeling_paint', 'piled_mail', 'junk_debris', 'broken_fence', 'vacant_look']) {
      expect(ANALYSIS_PROMPT).toContain(id)
    }
  })

  it('sends the photo and the prompt, not an address or a phone number', () => {
    const studio = JSON.stringify(studioRequestBody('abc', 'image/jpeg'))
    const ollama = JSON.stringify(ollamaRequestBody('abc', 'gemma3:4b'))
    for (const body of [studio, ollama]) {
      expect(body).toContain('abc')
      expect(body).not.toContain('Hemet')
      expect(body).not.toContain('555')
      expect(body).not.toMatch(/"address"/)
    }
    expect(studio).toContain('inlineData')
    expect(ollama).toContain('"images"')
  })

  it('flags text-only Ollama tags and normalizes the base URL', () => {
    expect(modelLikelyTextOnly('gemma3:1b')).toBe(true)
    expect(modelLikelyTextOnly('gemma3:270m')).toBe(true)
    expect(modelLikelyTextOnly('gemma-3-1b-it')).toBe(true)
    expect(modelLikelyTextOnly('gemma3:4b')).toBe(false)
    expect(modelLikelyTextOnly('gemma-4-31b-it')).toBe(false)
    expect(normalizeOllamaUrl('http://127.0.0.1:11434/api/chat/')).toBe('http://127.0.0.1:11434')
    expect(mixedContentRisk('https:', 'http://192.168.1.8:11434')).toMatch(/iPhone Safari/)
    expect(mixedContentRisk('http:', 'http://127.0.0.1:11434')).toBeNull()
  })
})

describe('sample houses', () => {
  it('ships four credited photos with hand-labeled signals', () => {
    expect(SAMPLES).toHaveLength(4)
    for (const sample of SAMPLES) {
      expect(existsSync(`public/${sample.file}`)).toBe(true)
      expect(sample.credit.length).toBeGreaterThan(0)
      expect(sample.creditUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
      expect(sample.score).toBeGreaterThanOrEqual(0)
      expect(sample.score).toBeLessThanOrEqual(100)
      expect(sample.confidence).toMatch(/not a live model call/i)
      const present = presentSignals(sampleSignals(sample))
      expect(present.length).toBeGreaterThan(0)
      expect(present.every((signal) => signal.evidence.length > 0)).toBe(true)
    }
  })
})
