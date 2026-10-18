import { presentSignals } from './signals'
import type { Lead, LeadStatus } from './types'

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  letter_sent: 'Letter sent',
  follow_up: 'Follow up',
  dead: 'Dead',
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function leadsToCsv(leads: Lead[]): string {
  const header = [
    'created_at',
    'address',
    'latitude',
    'longitude',
    'distress_score',
    'signals',
    'confidence',
    'reason',
    'status',
    'notes',
    'letter_en',
    'letter_es',
    'backend',
    'model',
  ]
  const rows = leads.map((lead) =>
    [
      new Date(lead.createdAt).toISOString(),
      lead.address,
      lead.lat ?? '',
      lead.lng ?? '',
      lead.score,
      presentSignals(lead.signals)
        .map((signal) => signal.label)
        .join('; '),
      lead.confidence,
      lead.reason,
      STATUS_LABEL[lead.status],
      lead.notes,
      lead.letterEn,
      lead.letterEs,
      lead.backend,
      lead.modelId,
    ]
      .map(cell)
      .join(','),
  )
  return `\uFEFF${[header.join(','), ...rows].join('\n')}\n`
}
