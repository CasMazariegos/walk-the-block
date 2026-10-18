import { useMemo, useState } from 'react'
import { leadsToCsv, STATUS_LABEL } from '../csv'
import { formatWhen, scoreTone } from '../format'
import { presentSignals } from '../signals'
import type { Lead, LeadStatus } from '../types'
import { Thumb } from './Thumb'

type SortKey = 'score' | 'newest' | 'status'

const STATUS_ORDER: Record<LeadStatus, number> = {
  new: 0,
  follow_up: 1,
  letter_sent: 2,
  dead: 3,
}

interface Props {
  leads: Lead[]
  onOpen: (id: string) => void
  onStatus: (id: string, status: LeadStatus) => void
  onSnap: () => void
}

export function LeadsView({ leads, onOpen, onStatus, onSnap }: Props) {
  const [sort, setSort] = useState<SortKey>('score')
  const sorted = useMemo(() => {
    const copy = leads.slice()
    copy.sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt
      if (sort === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.score - a.score
      return b.score - a.score || b.createdAt - a.createdAt
    })
    return copy
  }, [leads, sort])

  function exportCsv() {
    const blob = new Blob([leadsToCsv(sorted)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'walk-the-block-leads.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1>Leads</h1>
          <p className="fine">
            {leads.length === 0 ? 'Nothing saved yet.' : `${leads.length} on this phone. They never leave it.`}
          </p>
        </div>
        <button type="button" className="btn small ghost" disabled={leads.length === 0} onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <div className="segment" role="group" aria-label="Sort leads">
        {(['score', 'newest', 'status'] as const).map((key) => (
          <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}>
            {key === 'score' ? 'Score' : key === 'newest' ? 'Newest' : 'Status'}
          </button>
        ))}
      </div>
      {sorted.length === 0 && (
        <div className="card empty">
          <p>Snap a house, or add a sample, and it will land here with the photo.</p>
          <button type="button" className="btn primary" onClick={onSnap}>
            Back to the block
          </button>
        </div>
      )}
      <ul className="lead-list">
        {sorted.map((lead) => (
          <li key={lead.id}>
            <article className="lead-card">
              <button type="button" className="lead-open" onClick={() => onOpen(lead.id)}>
                <Thumb blob={lead.thumb} alt="" className="thumb" />
                <span>
                  <span className="lead-top">
                    <strong className={`score-mini tone-${scoreTone(lead.score)}`}>{lead.score}</strong>
                    <span>{lead.address || 'No address yet'}</span>
                  </span>
                  <span className="fine">{formatWhen(lead.createdAt)}</span>
                  <span className="mini-chips">
                    {presentSignals(lead.signals).map((signal) => (
                      <span key={signal.id}>{signal.label}</span>
                    ))}
                  </span>
                </span>
              </button>
              <label className="status-label">
                <span className="sr">Status</span>
                <select
                  value={lead.status}
                  onChange={(event) => onStatus(lead.id, event.target.value as LeadStatus)}
                >
                  {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
