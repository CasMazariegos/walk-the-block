import { blankSignals, type SignalHit, type SignalId } from './signals'

export interface SampleHouse {
  id: string
  title: string
  file: string
  credit: string
  creditUrl: string
  score: number
  reason: string
  confidence: string
  present: Partial<Record<SignalId, string>>
}

/**
 * Hand-labeled readings of public photos so the app can be tried with no API key.
 * Claims follow the photographer's own caption. These are not live model output.
 */
export const SAMPLES: SampleHouse[] = [
  {
    id: 'boarded-gary',
    title: 'Boarded front',
    file: 'samples/boarded-gary.jpg',
    credit: 'Photo by Milwaukee3181, public domain.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Boarded_up_house_in_Gary_Indiana.jpg',
    score: 72,
    reason: 'Window openings on the front are boarded.',
    confidence:
      'Hand-labeled demo, not a live model call. The front of the house is in frame, and the boards are the marked signal.',
    present: {
      boarded_windows: 'Window openings on the front are covered with boards.',
      vacant_look: 'The openings are boarded, so the building looks unused from the street.',
    },
  },
  {
    id: 'tarp-terrebonne',
    title: 'Blue roof tarp',
    file: 'samples/tarp-terrebonne.jpg',
    credit: 'Photo by Barry Bahler / FEMA, public domain.',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:FEMA_-_38076_-_A_Blue_Tarp_installed_on_a_home_in_Terrebone_Parrish,_LA.jpg',
    score: 60,
    reason: 'A blue tarp covers the roof.',
    confidence:
      'Hand-labeled demo, not a live model call. The roof covering is the marked signal. The photo does not say why it is there.',
    present: {
      tarp_roof: 'A blue tarp is installed across the roof.',
    },
  },
  {
    id: 'tarp-valdosta',
    title: 'Roof tarp',
    file: 'samples/tarp-valdosta.jpg',
    credit: 'Photo by Mjrmtg, CC0.',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Hurricane_Helene,_Valdosta,_Fairview_Historic_District,_tarp_on_roof.jpg',
    score: 58,
    reason: 'A tarp is visible on the roof.',
    confidence:
      'Hand-labeled demo, not a live model call. The roof is the clearest part of the frame, so other sides of the house are easy to miss.',
    present: {
      tarp_roof: 'A tarp covers part of the roof.',
    },
  },
  {
    id: 'peeling-neptune',
    title: 'Peeling paint',
    file: 'samples/peeling-neptune.jpg',
    credit: 'Photo by Michael Philip Manheim, U.S. National Archives, public domain.',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:PEELING_PAINT_ON_THIS_NEPTUNE_ROAD_HOUSE_TYPIFIES_NEGLECT_OF_EXTERIOR_HOME_MAINTENANCE_BY_RESIDENTS_OF_THIS..._-_NARA_-_549289.jpg',
    score: 49,
    reason: 'Paint is peeling on the front of the house.',
    confidence:
      'Hand-labeled demo, not a live model call. Peeling paint is the marked signal. Nothing here is a claim about the people who lived there.',
    present: {
      peeling_paint: 'Paint is peeling on the front of the house.',
    },
  },
]

export function sampleSignals(sample: SampleHouse): SignalHit[] {
  return blankSignals().map((signal) => {
    const evidence = sample.present[signal.id]
    if (!evidence) return signal
    return { ...signal, present: true, evidence }
  })
}

export function sampleUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`
}
