export function formatWhen(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

export function scoreTone(score: number): 'low' | 'mid' | 'high' {
  if (score >= 67) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}

export function scoreCaption(score: number): string {
  if (score >= 76) return 'A lot showing'
  if (score >= 51) return 'Worth a note'
  if (score >= 26) return 'A few signs'
  return 'Little to see'
}

export function formatPin(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
