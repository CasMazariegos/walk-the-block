import { DEFAULT_OLLAMA_MODEL, DEFAULT_STUDIO_MODEL } from './prompt'
import type { Settings } from './types'

const SETTINGS_KEY = 'wtb-settings'
const API_KEY = 'wtb-aistudio-key'

export const DEFAULT_SETTINGS: Settings = {
  backend: 'demo',
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  studioModel: DEFAULT_STUDIO_MODEL,
  letterLang: 'en',
  buyer: {
    name: '',
    phone: '',
    city: 'Hemet',
  },
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    const backend = parsed.backend === 'ollama' || parsed.backend === 'aistudio' || parsed.backend === 'demo'
      ? parsed.backend
      : DEFAULT_SETTINGS.backend
    const letterLang = parsed.letterLang === 'es' ? 'es' : 'en'
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      backend,
      letterLang,
      buyer: { ...DEFAULT_SETTINGS.buyer, ...parsed.buyer },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadApiKey(): string {
  return localStorage.getItem(API_KEY) ?? ''
}

export function saveApiKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed) localStorage.removeItem(API_KEY)
  else localStorage.setItem(API_KEY, trimmed)
}
