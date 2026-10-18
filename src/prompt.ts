import { SIGNAL_CATALOG } from './signals'

const SIGNAL_GUIDE = [
  'tarp_roof: a tarp, missing shingles, or a visibly damaged roof',
  'overgrown_yard: grass, weeds, or shrubs clearly overtaking the yard',
  'boarded_windows: boards or solid coverings over windows or doors',
  'peeling_paint: paint visibly peeling or flaking on siding or trim',
  'piled_mail: stacked mail, newspapers, or posted notices',
  'junk_debris: piled trash, furniture, or debris in the yard',
  'broken_fence: a fence that is fallen, missing sections, or clearly broken',
  'vacant_look: the building appears unused from the street (boarded openings, no visible furnishings, dark empty windows). This is about the building, not a person',
].join('\n')

export const ANALYSIS_PROMPT = `You assess one street photo of a house for a buyer who only wants visible exterior facts.

Rules:
- Describe only what is visible in the photo.
- Do not guess, invent, or imply anything about the owner or occupants. No finances, foreclosure, health, death, divorce, legal status, emotions, or reasons the property looks this way.
- If a signal is not clearly visible, set present to false and leave evidence as an empty string.
- Do not identify people, faces, license plates, or house numbers.
- distressScore is an integer from 0 (well kept) to 100 (many clear exterior distress signals). Use only the signals you mark present.
- reason is one short sentence naming only visible signals. No advice and no speculation.
- confidence is one short sentence about the photo's limits: distance, angle, lighting, or what is cropped.
- letterEn and letterEs are postcards to the owner. They must not mention the photo, the score, repairs, condition, defects, urgency, or the owner's situation. They must be kind and easy to ignore. Use these placeholders exactly: {{name}} {{phone}} {{city}} {{property}}. Write English in letterEn and respectful Spanish (usted) in letterEs. About 70 to 110 words each.

Signal meanings:
${SIGNAL_GUIDE}

Return only a JSON object, no markdown, with every signal id listed here: ${SIGNAL_CATALOG.map((signal) => signal.id).join(', ')}.
Shape:
{"distressScore":0,"signals":[{"id":"tarp_roof","present":false,"evidence":""},{"id":"overgrown_yard","present":false,"evidence":""},{"id":"boarded_windows","present":false,"evidence":""},{"id":"peeling_paint","present":false,"evidence":""},{"id":"piled_mail","present":false,"evidence":""},{"id":"junk_debris","present":false,"evidence":""},{"id":"broken_fence","present":false,"evidence":""},{"id":"vacant_look","present":false,"evidence":""}],"confidence":"","reason":"","letterEn":"","letterEs":""}`

export const STUDIO_MODELS = [
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemma-3-4b-it',
] as const

export const OLLAMA_MODELS = ['gemma3:4b', 'gemma3:12b', 'gemma3:27b', 'gemma4:e4b'] as const

export const DEFAULT_STUDIO_MODEL = 'gemma-4-31b-it'
export const DEFAULT_OLLAMA_MODEL = 'gemma3:4b'

/** Gemma 3 270M and 1B on Ollama are text-only. Vision starts at 4B. */
export function modelLikelyTextOnly(modelId: string): boolean {
  return /(?:^|[/:._-])(270m|1b)(?:$|[/:._-])/i.test(modelId.trim())
}
