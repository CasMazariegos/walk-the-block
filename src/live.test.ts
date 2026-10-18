import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { completeStudio } from './backends'
import { parseAnalysis } from './parse'
import { resolveLetters } from './letter'
import { presentSignals } from './signals'

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
const model = process.env.GEMMA_MODEL || 'gemma-4-31b-it'

describe('live Gemma', () => {
  it.skipIf(!apiKey)(
    `reads public/samples/boarded-gary.jpg with ${model}`,
    async () => {
      const bytes = await readFile('public/samples/boarded-gary.jpg')
      const raw = await completeStudio({
        apiKey,
        model,
        imageBase64: bytes.toString('base64'),
        mimeType: 'image/jpeg',
      })
      const analysis = parseAnalysis(raw)
      expect(analysis.distressScore).toBeGreaterThanOrEqual(0)
      expect(analysis.distressScore).toBeLessThanOrEqual(100)
      expect(analysis.reason.length).toBeGreaterThan(0)
      expect(analysis.signals).toHaveLength(8)
      expect(presentSignals(analysis.signals).length).toBeGreaterThan(0)
      const letters = resolveLetters(analysis, { name: 'Ada', phone: '951-555-0100', city: 'Hemet' }, '')
      expect(letters.en).toContain('951-555-0100')
      expect(letters.es.length).toBeGreaterThan(40)
      expect(letters.en.toLowerCase()).not.toContain('foreclosure')
    },
  )
})
