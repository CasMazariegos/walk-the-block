import { describe, expect, it } from 'vitest'
import { composeLetter, passesCompliance, resolveLetters } from './letter'
import type { BuyerProfile } from './types'

const profile: BuyerProfile = { name: 'Cassandra', phone: '951-555-0134', city: 'Hemet' }

describe('letters', () => {
  it('writes a kind note in both languages without naming the house condition', () => {
    const english = composeLetter('en', profile, '410 Oak St')
    const spanish = composeLetter('es', profile, '410 Oak St')
    expect(english).toContain('Cassandra')
    expect(english).toContain('951-555-0134')
    expect(english).toContain('410 Oak St')
    expect(english).toContain('no pressure')
    expect(spanish).toContain('951-555-0134')
    expect(spanish).toContain('410 Oak St')
    expect(passesCompliance(english)).toBe(true)
    expect(passesCompliance(spanish)).toBe(true)
    expect(english.toLowerCase()).not.toContain('roof')
    expect(spanish.toLowerCase()).not.toContain('techo')
  })

  it('uses placeholders when the buyer profile is empty', () => {
    const english = composeLetter('en', { name: '', phone: '', city: '' }, '')
    expect(english).toContain('[your name]')
    expect(english).toContain('[your phone]')
    expect(english).toContain('your property')
    expect(english).toContain('this area')
  })

  it('rejects a draft that describes the roof and falls back to the standard note', () => {
    const resolved = resolveLetters(
      {
        letterEn: 'Hello {{name}}, I noticed your roof is in bad shape. Call {{phone}} about your property in {{city}}.',
        letterEs: 'Hola {{name}}, vi la lona en el techo. Llame al {{phone}} en {{city}} por {{property}}.',
      },
      profile,
      '',
    )
    expect(resolved.source).toBe('template')
    expect(resolved.note).toMatch(/standard note/)
    expect(resolved.en).toContain('951-555-0134')
    expect(resolved.en.toLowerCase()).not.toContain('roof')
  })

  it('keeps a compliant Gemma draft and fills the placeholders', () => {
    const resolved = resolveLetters(
      {
        letterEn:
          'Hello, my name is {{name}}. I buy houses in {{city}} and would make a fair offer on {{property}} if you ever want to sell. No pressure. Text {{phone}} if you like.',
        letterEs:
          'Hola, me llamo {{name}}. Compro casas en {{city}} y haría una oferta justa por {{property}} si algún día quiere vender. Sin presión. Escriba al {{phone}} si gusta.',
      },
      profile,
      '12 Palm',
    )
    expect(resolved.source).toBe('model')
    expect(resolved.en).toContain('Cassandra')
    expect(resolved.en).toContain('the house at 12 Palm')
    expect(resolved.es).toContain('la casa en 12 Palm')
    expect(resolved.es).toContain('951-555-0134')
    expect(resolved.note).toBe('')
  })
})
