import { useEffect, useRef, useState } from 'react'
import { AnalyzeError, completeOllama, completeStudio } from './backends'
import { deleteLead, getAllLeads, putLead } from './db'
import { blobToBase64, prepareImage } from './image'
import { composeLetter, resolveLetters } from './letter'
import { parseAnalysis } from './parse'
import { modelLikelyTextOnly } from './prompt'
import { SAMPLES, sampleSignals, sampleUrl, type SampleHouse } from './samples'
import { loadApiKey, loadSettings, saveApiKey, saveSettings } from './settings'
import type { Lead, LeadStatus, LetterLang, Settings } from './types'
import { AboutView } from './ui/AboutView'
import { IconCamera, IconGear, IconInfo, IconList } from './ui/icons'
import { LeadsView } from './ui/LeadsView'
import { ResultView } from './ui/ResultView'
import { SettingsView } from './ui/SettingsView'
import { SnapView, type Draft } from './ui/SnapView'

type View = 'snap' | 'reading' | 'result' | 'leads' | 'settings' | 'about'

const EMPTY_DRAFT: Draft = { address: '', notes: '', lat: null, lng: null }

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong. Try the photo again.'
}

export function App() {
  const [view, setView] = useState<View>('snap')
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [apiKey, setApiKey] = useState(() => loadApiKey())
  const [leads, setLeads] = useState<Lead[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<{ previewUrl: string; message: string } | null>(null)
  const requestRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    getAllLeads()
      .then(setLeads)
      .catch(() => {
        setError('This browser blocked the on-device lead list. Safari private mode sometimes does that.')
      })
  }, [])

  function updateSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function updateApiKey(key: string) {
    setApiKey(key)
    saveApiKey(key)
  }

  function stopWork() {
    requestRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setReading(null)
  }

  function go(next: View) {
    stopWork()
    setView(next)
  }

  async function persist(lead: Lead) {
    setLeads((current) => {
      const rest = current.filter((item) => item.id !== lead.id)
      return [lead, ...rest].sort((a, b) => b.createdAt - a.createdAt)
    })
    try {
      await putLead(lead)
    } catch {
      setError('The reading is on screen, but this browser refused to store it.')
    }
  }

  async function leadFromSample(sample: SampleHouse): Promise<Lead> {
    const response = await fetch(sampleUrl(sample.file))
    if (!response.ok) throw new Error('A sample photo did not load.')
    const prepared = await prepareImage(await response.blob())
    const letters = resolveLetters({}, settings.buyer, '')
    const now = Date.now()
    return {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      photo: prepared.photo,
      thumb: prepared.thumb,
      address: '',
      notes: '',
      lat: null,
      lng: null,
      score: sample.score,
      signals: sampleSignals(sample),
      confidence: sample.confidence,
      reason: sample.reason,
      letterEn: letters.en,
      letterEs: letters.es,
      letterSource: 'template',
      letterDirty: false,
      letterDirtyEs: false,
      letterNote: '',
      status: 'new',
      backend: 'demo',
      modelId: 'hand-labeled sample',
      sampleId: sample.id,
      credit: sample.credit,
      creditUrl: sample.creditUrl,
    }
  }

  async function openSample(sample: SampleHouse) {
    const requestId = ++requestRef.current
    setError(null)
    setView('reading')
    setReading({
      previewUrl: sampleUrl(sample.file),
      message: 'Opening a sample reading. Nothing is uploaded.',
    })
    try {
      await new Promise((resolve) => setTimeout(resolve, 650))
      if (requestId !== requestRef.current) return
      const lead = await leadFromSample(sample)
      if (requestId !== requestRef.current) return
      await persist(lead)
      setActiveId(lead.id)
      setView('result')
    } catch (caught) {
      if (requestId !== requestRef.current) return
      setError(messageOf(caught))
      setView('snap')
    } finally {
      if (requestId === requestRef.current) setReading(null)
    }
  }

  async function addAllSamples() {
    const missing = SAMPLES.filter((sample) => !leads.some((lead) => lead.sampleId === sample.id))
    if (missing.length === 0) {
      setView('leads')
      return
    }
    const requestId = ++requestRef.current
    setError(null)
    setView('reading')
    setReading({
      previewUrl: sampleUrl(missing[0].file),
      message: 'Saving the sample houses on this phone. Nothing is uploaded.',
    })
    try {
      const created: Lead[] = []
      for (const sample of missing) {
        if (requestId !== requestRef.current) return
        created.push(await leadFromSample(sample))
      }
      if (requestId !== requestRef.current) return
      for (const lead of created) await putLead(lead)
      setLeads((current) => [...created, ...current].sort((a, b) => b.createdAt - a.createdAt))
      setView('leads')
    } catch (caught) {
      if (requestId !== requestRef.current) return
      setError(messageOf(caught))
      setView('snap')
    } finally {
      if (requestId === requestRef.current) setReading(null)
    }
  }

  async function scoreFile(file: File) {
    if (settings.backend === 'demo') {
      setError(
        'Demo mode only reads the four sample houses. Your photo was not uploaded and was not saved. Switch to Private or AI Studio in Settings to score a photo you took.',
      )
      setView('snap')
      return
    }
    if (settings.backend === 'ollama' && modelLikelyTextOnly(settings.ollamaModel)) {
      setError(`${settings.ollamaModel} is text-only. Use gemma3:4b or another vision model.`)
      return
    }
    const requestId = ++requestRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    let previewUrl = ''
    try {
      const prepared = await prepareImage(file)
      if (requestId !== requestRef.current) return
      previewUrl = URL.createObjectURL(prepared.photo)
      const modelId = settings.backend === 'ollama' ? settings.ollamaModel : settings.studioModel
      setReading({
        previewUrl,
        message:
          settings.backend === 'ollama'
            ? `Gemma is reading the photo on ${modelId}. The address stays on this phone.`
            : `Sending the photo to ${modelId}. The address, notes, and pin stay on this phone.`,
      })
      setView('reading')
      const imageBase64 = await blobToBase64(prepared.photo)
      const raw =
        settings.backend === 'ollama'
          ? await completeOllama({
              url: settings.ollamaUrl,
              model: settings.ollamaModel,
              imageBase64,
              signal: controller.signal,
            })
          : await completeStudio({
              apiKey,
              model: settings.studioModel,
              imageBase64,
              mimeType: 'image/jpeg',
              signal: controller.signal,
            })
      if (requestId !== requestRef.current) return
      const analysis = parseAnalysis(raw)
      const letters = resolveLetters(analysis, settings.buyer, draft.address)
      const now = Date.now()
      const lead: Lead = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        photo: prepared.photo,
        thumb: prepared.thumb,
        address: draft.address.trim(),
        notes: draft.notes.trim(),
        lat: draft.lat,
        lng: draft.lng,
        score: analysis.distressScore,
        signals: analysis.signals,
        confidence: analysis.confidence,
        reason: analysis.reason,
        letterEn: letters.en,
        letterEs: letters.es,
        letterSource: letters.source,
        letterDirty: false,
        letterNote: letters.note,
        status: 'new',
        backend: settings.backend,
        modelId,
        sampleId: '',
        credit: '',
        creditUrl: '',
      }
      await persist(lead)
      setDraft(EMPTY_DRAFT)
      setActiveId(lead.id)
      setView('result')
    } catch (caught) {
      if (requestId !== requestRef.current) return
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof AnalyzeError ? caught.message : messageOf(caught))
      setView('snap')
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (requestId === requestRef.current) setReading(null)
    }
  }

  function patchLead(id: string, patch: Partial<Lead>, refreshLetter = false) {
    const current = leads.find((lead) => lead.id === id)
    if (!current) return
    let next: Lead = { ...current, ...patch, updatedAt: Date.now() }
    if (refreshLetter && next.letterSource === 'template') {
      const dirtyEs = next.letterDirtyEs ?? next.letterDirty
      next = {
        ...next,
        letterEn: next.letterDirty ? next.letterEn : composeLetter('en', settings.buyer, next.address),
        letterEs: dirtyEs ? next.letterEs : composeLetter('es', settings.buyer, next.address),
        letterNote: '',
      }
    }
    void persist(next)
  }

  function useStandard(id: string) {
    const current = leads.find((lead) => lead.id === id)
    if (!current) return
    void persist({
      ...current,
      letterEn: composeLetter('en', settings.buyer, current.address),
      letterEs: composeLetter('es', settings.buyer, current.address),
      letterSource: 'template',
      letterDirty: false,
      letterDirtyEs: false,
      letterNote: '',
      updatedAt: Date.now(),
    })
  }

  async function removeLead(id: string) {
    setLeads((current) => current.filter((lead) => lead.id !== id))
    setActiveId(null)
    setView('leads')
    try {
      await deleteLead(id)
    } catch {
      setError('Could not remove that lead from this phone.')
    }
  }

  function setLang(lang: LetterLang) {
    updateSettings({ ...settings, letterLang: lang })
  }

  const active = leads.find((lead) => lead.id === activeId) ?? null
  const snapActive = view === 'snap' || view === 'reading' || view === 'result'

  return (
    <div className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => go('snap')}>
          <span className="bulb" aria-hidden="true" />
          Walk the Block
        </button>
        <button
          type="button"
          className={view === 'settings' ? 'icon-btn on' : 'icon-btn'}
          aria-label="Settings"
          onClick={() => go('settings')}
        >
          <IconGear />
        </button>
      </header>
      <main>
        {error && view !== 'snap' && (
          <p className="banner" role="alert">
            {error}
          </p>
        )}
        {view === 'reading' && reading && (
          <section className="stack reading">
            <div className="photo-frame">
              <img src={reading.previewUrl} alt="" />
            </div>
            <p className="lede" role="status">
              {reading.message}
            </p>
          </section>
        )}
        {view === 'snap' && (
          <SnapView
            settings={settings}
            draft={draft}
            samples={SAMPLES}
            error={error}
            onDraft={setDraft}
            onFile={(file) => void scoreFile(file)}
            onSample={(sample) => void openSample(sample)}
            onAddAll={() => void addAllSamples()}
            onSettings={() => go('settings')}
          />
        )}
        {view === 'result' && active && (
          <ResultView
            lead={active}
            lang={settings.letterLang}
            onLang={setLang}
            onPatch={(patch, refresh) => patchLead(active.id, patch, refresh)}
            onStandard={() => useStandard(active.id)}
            onDelete={() => void removeLead(active.id)}
            onSettings={() => go('settings')}
          />
        )}
        {view === 'result' && !active && (
          <section className="stack">
            <p>That lead is no longer on this phone.</p>
            <button type="button" className="btn primary" onClick={() => go('leads')}>
              Back to leads
            </button>
          </section>
        )}
        {view === 'leads' && (
          <LeadsView
            leads={leads}
            onOpen={(id) => {
              setActiveId(id)
              setView('result')
            }}
            onStatus={(id, status: LeadStatus) => patchLead(id, { status })}
            onSnap={() => go('snap')}
          />
        )}
        {view === 'settings' && (
          <SettingsView settings={settings} apiKey={apiKey} onSettings={updateSettings} onApiKey={updateApiKey} />
        )}
        {view === 'about' && <AboutView />}
      </main>
      <nav className="nav">
        <button type="button" className={snapActive ? 'on' : ''} onClick={() => go('snap')}>
          <IconCamera />
          Snap
        </button>
        <button type="button" className={view === 'leads' ? 'on' : ''} onClick={() => go('leads')}>
          <IconList />
          Leads
          {leads.length > 0 && <span className="count">{leads.length}</span>}
        </button>
        <button type="button" className={view === 'about' ? 'on' : ''} onClick={() => go('about')}>
          <IconInfo />
          About
        </button>
      </nav>
    </div>
  )
}
