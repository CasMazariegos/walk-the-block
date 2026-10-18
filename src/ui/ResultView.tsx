import { useEffect, useState } from 'react'
import { scoreCaption, scoreTone } from '../format'
import { STATUS_LABEL } from '../csv'
import { presentSignals } from '../signals'
import type { Lead, LeadStatus, LetterLang } from '../types'
import { Thumb } from './Thumb'

interface Props {
  lead: Lead
  lang: LetterLang
  onLang: (lang: LetterLang) => void
  onPatch: (patch: Partial<Lead>, refreshLetter?: boolean) => void
  onStandard: () => void
  onDelete: () => void
  onSettings: () => void
}

export function ResultView({ lead, lang, onLang, onPatch, onStandard, onDelete, onSettings }: Props) {
  const [address, setAddress] = useState(lead.address)
  const [notes, setNotes] = useState(lead.notes)
  const [letter, setLetter] = useState(lang === 'es' ? lead.letterEs : lead.letterEn)
  const [copied, setCopied] = useState('')
  const [armed, setArmed] = useState(false)
  const tone = scoreTone(lead.score)
  const found = presentSignals(lead.signals)
  const missed = lead.signals.filter((signal) => !signal.present)
  const sourceLabel = lead.letterDirty ? 'Your edit' : lead.letterSource === 'model' ? "Gemma's note" : 'Standard note'

  useEffect(() => {
    setAddress(lead.address)
    setNotes(lead.notes)
    setLetter(lang === 'es' ? lead.letterEs : lead.letterEn)
  }, [lead, lang])

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(letter)
      setCopied('Copied')
    } catch {
      setCopied('Select the note and copy it')
    }
  }

  async function shareNote() {
    if (navigator.share) {
      try {
        await navigator.share({ text: letter })
        return
      } catch {
        return
      }
    }
    await copyNote()
  }

  return (
    <section className="stack">
      <p className="eyebrow">{lead.backend === 'demo' ? 'Sample reading' : lead.modelId}</p>
      <div className="photo-frame">
        <Thumb blob={lead.photo} alt="House photo" className="photo" />
      </div>
      {lead.credit && (
        <p className="fine">
          {lead.credit}{' '}
          {lead.creditUrl && (
            <a href={lead.creditUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          )}
        </p>
      )}

      <div className="score-row">
        <div className={`score tone-${tone}`} style={{ ['--p' as string]: String(lead.score) }}>
          <strong>{lead.score}</strong>
          <span>of 100</span>
        </div>
        <div>
          <p className="score-caption">{scoreCaption(lead.score)}</p>
          <p className="reason">{lead.reason}</p>
          <p className="fine">Visible wear only. Not a story about the owner.</p>
        </div>
      </div>

      <div className="chips">
        {found.map((signal) => (
          <span key={signal.id} className="chip">
            {signal.label}
          </span>
        ))}
        {found.length === 0 && <span className="chip quiet">Nothing clear in this photo</span>}
      </div>
      <ul className="evidence">
        {found.map((signal) => (
          <li key={signal.id}>
            <strong>{signal.label}.</strong> {signal.evidence}
          </li>
        ))}
      </ul>
      <details className="quiet-details">
        <summary>Not visible here ({missed.length})</summary>
        <p>{missed.map((signal) => signal.label).join(' · ')}</p>
      </details>
      <p className="confidence">{lead.confidence}</p>

      <div className="card">
        <div className="section-head">
          <h2>Postcard</h2>
          <span className="fine">{sourceLabel}</span>
        </div>
        <div className="segment" role="group" aria-label="Note language">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => onLang('en')}>
            English
          </button>
          <button type="button" aria-pressed={lang === 'es'} onClick={() => onLang('es')}>
            Español
          </button>
        </div>
        {lead.letterNote && <p className="fine">{lead.letterNote}</p>}
        <textarea
          className="letter"
          rows={12}
          value={letter}
          onChange={(event) => setLetter(event.target.value)}
          onBlur={() => {
            if (letter === (lang === 'es' ? lead.letterEs : lead.letterEn)) return
            onPatch(lang === 'es' ? { letterEs: letter, letterDirty: true } : { letterEn: letter, letterDirty: true })
          }}
        />
        <p className="fine">This note does not mention the photo. You can edit it before you copy it.</p>
        {letter.includes('[your phone]') && (
          <button type="button" className="text-btn" onClick={onSettings}>
            Add your number in Settings.
          </button>
        )}
        <div className="row">
          <button type="button" className="btn primary" onClick={() => void copyNote()}>
            {copied || 'Copy note'}
          </button>
          <button type="button" className="btn ghost" onClick={() => void shareNote()}>
            Share
          </button>
        </div>
        <button type="button" className="text-btn" onClick={onStandard}>
          Use standard note
        </button>
      </div>

      <div className="card">
        <label className="field">
          <span>Address</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onBlur={() => {
              if (address !== lead.address) onPatch({ address }, true)
            }}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== lead.notes) onPatch({ notes })
            }}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            value={lead.status}
            onChange={(event) => onPatch({ status: event.target.value as LeadStatus })}
          >
            {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="btn ghost danger"
        onClick={() => {
          if (!armed) {
            setArmed(true)
            return
          }
          onDelete()
        }}
      >
        {armed ? 'Tap again to remove' : 'Remove lead'}
      </button>
    </section>
  )
}
