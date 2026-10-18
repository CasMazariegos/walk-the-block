export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error('The street lookup did not answer.')
  const data = (await response.json()) as {
    display_name?: string
    address?: Record<string, string>
  }
  const address = data.address ?? {}
  const street = [address.house_number, address.road].filter(Boolean).join(' ')
  const city = address.city || address.town || address.village || address.hamlet || ''
  const region = address.state || ''
  const compact = [street, city, region].filter(Boolean).join(', ')
  if (!compact && !data.display_name) throw new Error('No street name came back.')
  return compact || data.display_name || ''
}
