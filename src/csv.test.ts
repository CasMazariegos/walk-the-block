import { describe, expect, it } from 'vitest'
import { leadsToCsv } from './csv'
import { blankSignals } from './signals'
import type { Lead } from './types'

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: '1',
    createdAt: Date.UTC(2026, 9, 18, 20, 0, 0),
    updatedAt: Date.UTC(2026, 9, 18, 20, 0, 0),
    photo: new Blob(),
    thumb: new Blob(),
    address: '410 Oak St, Hemet',
    notes: 'Gate was open, "try the side"',
    lat: 33.7475,
    lng: -116.9719,
    score: 72,
    signals: blankSignals().map((signal) =>
      signal.id === 'boarded_windows' ? { ...signal, present: true, evidence: 'Boards' } : signal,
    ),
    confidence: 'Clear front.',
    reason: 'Boards on the windows.',
    letterEn: 'Hello',
    letterEs: 'Hola',
    letterSource: 'template',
    letterDirty: false,
    letterNote: '',
    status: 'new',
    backend: 'demo',
    modelId: 'sample',
    sampleId: 'boarded-gary',
    credit: '',
    creditUrl: '',
    ...overrides,
  }
}

describe('leadsToCsv', () => {
  it('escapes commas, quotes, and newlines and lists only visible signals', () => {
    const csv = leadsToCsv([
      lead({ notes: 'She said "maybe"\nnext week', address: '410 Oak St, Hemet' }),
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('distress_score')
    expect(csv).toContain('"410 Oak St, Hemet"')
    expect(csv).toContain('"She said ""maybe""\nnext week"')
    expect(csv).toContain('Boarded windows')
    expect(csv).not.toContain('Overgrown yard')
    expect(csv).toContain('New')
    expect(csv).toContain('2026-10-18T20:00:00.000Z')
  })

  it('neutralizes text that would run as a spreadsheet formula, but keeps negative numbers', () => {
    const csv = leadsToCsv([lead({ address: '=HYPERLINK("http://x")', notes: '@cmd' })])
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`)
    expect(csv).toContain("'@cmd")
    expect(csv).toContain(',-116.9719,')
  })
})
