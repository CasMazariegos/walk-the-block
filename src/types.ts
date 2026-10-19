import type { SignalHit } from './signals'

export type LeadStatus = 'new' | 'letter_sent' | 'follow_up' | 'dead'
export type BackendId = 'demo' | 'ollama' | 'aistudio'
export type LetterSource = 'template' | 'model'
export type LetterLang = 'en' | 'es'

export interface BuyerProfile {
  name: string
  phone: string
  city: string
}

export interface Settings {
  backend: BackendId
  ollamaUrl: string
  ollamaModel: string
  studioModel: string
  letterLang: LetterLang
  buyer: BuyerProfile
}

export interface Lead {
  id: string
  createdAt: number
  updatedAt: number
  photo: Blob
  thumb: Blob
  address: string
  notes: string
  lat: number | null
  lng: number | null
  score: number
  signals: SignalHit[]
  confidence: string
  reason: string
  letterEn: string
  letterEs: string
  letterSource: LetterSource
  /** You edited the English note. Older leads used this for either language. */
  letterDirty: boolean
  /** You edited the Spanish note. Missing on older leads, which fall back to letterDirty. */
  letterDirtyEs?: boolean
  letterNote: string
  status: LeadStatus
  backend: BackendId
  modelId: string
  sampleId: string
  credit: string
  creditUrl: string
}

export interface Analysis {
  distressScore: number
  signals: SignalHit[]
  confidence: string
  reason: string
  letterEn: string
  letterEs: string
}
