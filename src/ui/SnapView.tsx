import { useRef, useState } from 'react'
import { formatPin } from '../format'
import { reverseGeocode } from '../geo'
import { sampleUrl, type SampleHouse } from '../samples'
import type { Settings } from '../types'

export interface Draft {
  address: string
  notes: string
  lat: number | null
  lng: number | null
}

interface Props {
  settings: Settings
  draft: Draft
  samples: SampleHouse[]
  error: string | null
  onDraft: (draft: Draft) => void
  onFile: (file: File) => void
  onSample: (sample: SampleHouse) => void
  onAddAll: () => void
  onSettings: () => void
}

export function SnapView({ settings, draft, samples, error, onDraft, onFile, onSample, onAddAll, onSettings }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [pinNote, setPinNote] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  function take(list: FileList | null, input: HTMLInputElement | null) {
    const file = list?.[0]
    if (input) input.value = ''
    if (file) onFile(file)
  }

  function dropPin() {
    setPinNote('')
    if (!navigator.geolocation) {
      setPinNote('This browser has no GPS. Type the address instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onDraft({
          ...draft,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setPinNote('Pin saved on this phone. It is not sent with the photo.')
      },
      () => setPinNote('Location was blocked. Type the address instead.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    )
  }

  async function lookupStreet() {
    if (draft.lat === null || draft.lng === null) return
    setLookingUp(true)
    setPinNote('Asking OpenStreetMap for a street name. Only the pin is sent.')
    try {
      const address = await reverseGeocode(draft.lat, draft.lng)
      onDraft({ ...draft, address })
      setPinNote('Street name filled in. Check it before you trust it.')
    } catch {
      setPinNote('No street name came back. Type the address.')
    } finally {
      setLookingUp(false)
    }
  }

  const backendLabel =
    settings.backend === 'demo'
      ? 'Demo · samples only'
      : settings.backend === 'ollama'
        ? 'Private · Ollama'
        : 'AI Studio · photo leaves this phone'

  return (
    <section className="stack">
      <p className="eyebrow">Hemet · Riverside County</p>
      <h1>Score the house. Leave a kind note.</h1>
      <p className="lede">
        Snap the front from the sidewalk. Gemma marks only what is visible. The postcard never mentions it.
      </p>

      <button type="button" className="pill" onClick={onSettings}>
        {backendLabel}
      </button>

      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}

      <div className="hero-actions">
        <button type="button" className="btn primary" onClick={() => cameraRef.current?.click()}>
          Snap a house
        </button>
        <button type="button" className="btn ghost" onClick={() => uploadRef.current?.click()}>
          Upload a photo
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => take(event.target.files, event.target)}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => take(event.target.files, event.target)}
        />
      </div>

      <div className="card">
        <label className="field">
          <span>Address, if you know it</span>
          <input
            value={draft.address}
            autoComplete="off"
            placeholder="Optional. Stays on this phone."
            onChange={(event) => onDraft({ ...draft, address: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea
            rows={2}
            value={draft.notes}
            placeholder="Gate, dog, which side you shot. Never sent to the model."
            onChange={(event) => onDraft({ ...draft, notes: event.target.value })}
          />
        </label>
        <div className="row">
          <button type="button" className="btn small ghost" onClick={dropPin}>
            {draft.lat === null ? 'Drop a pin' : 'Update pin'}
          </button>
          <button
            type="button"
            className="btn small ghost"
            disabled={draft.lat === null || lookingUp}
            onClick={() => void lookupStreet()}
          >
            Look up street
          </button>
        </div>
        {draft.lat !== null && draft.lng !== null && <p className="fine">{formatPin(draft.lat, draft.lng)}</p>}
        {pinNote && <p className="fine">{pinNote}</p>}
      </div>

      <div className="section-head">
        <h2>Try a sample</h2>
        <button type="button" className="text-btn" onClick={onAddAll}>
          Add all 4
        </button>
      </div>
      <p className="fine">
        Public-domain and CC0 photos, hand-labeled so you can try the app with no key. Nothing is uploaded. The note uses
        the name and number in Settings.
      </p>
      <div className="samples">
        {samples.map((sample) => (
          <button key={sample.id} type="button" className="sample" onClick={() => onSample(sample)}>
            <span className="sample-photo">
              <img src={sampleUrl(sample.file)} alt="" />
              <span className={`badge tone-${sample.score >= 67 ? 'high' : sample.score >= 40 ? 'mid' : 'low'}`}>
                {sample.score}
              </span>
            </span>
            <span className="sample-copy">
              <strong>{sample.title}</strong>
              <span>{sample.credit.replace('Photo by ', '')}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
