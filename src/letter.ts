import type { BuyerProfile, LetterLang, LetterSource } from './types'

const BANNED = [
  'foreclosure',
  'pre-foreclosure',
  'preforeclosure',
  'behind on',
  'mortgage',
  'lien',
  'probate',
  'divorce',
  'died',
  'death',
  'deceased',
  'desperate',
  'urgent',
  'urgency',
  'urgen',
  'act now',
  'limited time',
  'last chance',
  'final notice',
  'hurry',
  'we noticed',
  'i noticed',
  'i saw',
  'i can see',
  'your roof',
  'tarp',
  'boarded',
  'overgrown',
  'peeling',
  'junk',
  'debris',
  'vacant',
  'abandoned',
  'distressed',
  'eyesore',
  'ugly',
  'rundown',
  'run-down',
  'run down',
  'fixer',
  'as-is',
  'as is',
  'must sell',
  'in trouble',
  'hardship',
  'struggling',
  'needs work',
  'needs repair',
  'falling apart',
  'ejecuci',
  'hipoteca',
  'embargo',
  'apúrate',
  'apurate',
  'techo',
  'lona',
  'pintura',
  'abandon',
  'basura',
  'deuda',
  'dificultad',
  'daño',
  'dano',
]

// Stems that should also match longer words (ejecución, abandoned, abandonada).
const STEMS = new Set(['ejecuci', 'abandon', 'urgen'])

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Whole words only, so "client" does not trip "lien" and "ciudadano" does not trip "dano".
// Plain words also catch a plural ending (liens, deudas).
const BANNED_PATTERNS = BANNED.map((phrase) => {
  const body = escapeRegex(phrase).replace(/ /g, '\\s+')
  const tail = STEMS.has(phrase) ? '' : '(?:s|es)?(?![\\p{L}\\p{N}])'
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${tail}`, 'iu')
})

export function passesCompliance(text: string): boolean {
  // "Sin embargo" means "however" in Spanish. It is not about a lien.
  const folded = text.toLowerCase().replace(/sin\s+embargo/g, ' ')
  if (folded.trim().length < 40) return false
  return !BANNED_PATTERNS.some((pattern) => pattern.test(folded))
}

function fill(template: string, values: Record<string, string>): string {
  let output = template
  for (const [key, value] of Object.entries(values)) {
    output = output.split(`{{${key}}}`).join(value)
  }
  return output
}

function fields(profile: BuyerProfile, address: string) {
  const city = profile.city.trim() || 'this area'
  const propertyEn = address.trim() ? `the house at ${address.trim()}` : 'your property'
  const propertyEs = address.trim() ? `la casa en ${address.trim()}` : 'su propiedad'
  return {
    name: profile.name.trim() || '[your name]',
    phone: profile.phone.trim() || '[your phone]',
    city,
    property: '',
    propertyEn,
    propertyEs,
  }
}

export function composeLetter(lang: LetterLang, profile: BuyerProfile, address: string): string {
  const data = fields(profile, address)
  if (lang === 'es') {
    return [
      'Hola,',
      '',
      `Me llamo ${data.name}. Compro casas aquí en ${data.city}. Si algún día decide vender ${data.propertyEs}, me gustaría hacerle una oferta justa y conversarlo con usted.`,
      '',
      `No hay presión ni una fecha para responder. Si no le interesa, puede ignorar esta nota. Si quiere hablar, puede llamarme o enviarme un mensaje de texto al ${data.phone} cuando le quede conveniente.`,
      '',
      'Gracias por su tiempo,',
      data.name,
    ].join('\n')
  }
  return [
    'Hello,',
    '',
    `My name is ${data.name}. I am a local buyer in ${data.city}. If you ever decide to sell ${data.propertyEn}, I would like to make a fair offer and talk it through with you.`,
    '',
    `There is no pressure and no deadline. If you are not interested, please ignore this note. If you want to talk, call or text me at ${data.phone} whenever it is convenient for you.`,
    '',
    'Thank you for your time,',
    data.name,
  ].join('\n')
}

function acceptableModelLetter(text: string): boolean {
  if (!text || text.length > 1200) return false
  if (!passesCompliance(text)) return false
  return text.includes('{{phone}}') || text.includes('[your phone]')
}

export interface ResolvedLetters {
  en: string
  es: string
  source: LetterSource
  note: string
}

export function resolveLetters(
  model: { letterEn?: string; letterEs?: string },
  profile: BuyerProfile,
  address: string,
): ResolvedLetters {
  const template = {
    en: composeLetter('en', profile, address),
    es: composeLetter('es', profile, address),
  }
  const rawEn = (model.letterEn ?? '').trim()
  const rawEs = (model.letterEs ?? '').trim()
  if (!rawEn && !rawEs) {
    return { ...template, source: 'template', note: '' }
  }
  if (!acceptableModelLetter(rawEn) || !acceptableModelLetter(rawEs)) {
    return {
      ...template,
      source: 'template',
      note: "Gemma's draft mentioned the house or skipped the phone line, so the standard note was used instead.",
    }
  }
  const data = fields(profile, address)
  const values = {
    name: data.name,
    phone: data.phone,
    city: data.city,
    property: data.propertyEn,
  }
  const valuesEs = { ...values, property: data.propertyEs }
  return {
    en: fill(rawEn, values),
    es: fill(rawEs, valuesEs),
    source: 'model',
    note: '',
  }
}
