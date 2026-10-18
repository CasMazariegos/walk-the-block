export function normalizeOllamaUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '')
  url = url.replace(/\/api(?:\/(?:chat|tags|generate))?$/i, '')
  return url
}

export function validateOllamaUrl(input: string): string | null {
  const url = normalizeOllamaUrl(input)
  if (!url) return 'Add the Ollama address, for example http://127.0.0.1:11434.'
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Use an http or https address.'
    }
    return null
  } catch {
    return 'That Ollama address is not a URL.'
  }
}

export function mixedContentRisk(pageProtocol: string, ollamaUrl: string): string | null {
  if (pageProtocol !== 'https:') return null
  try {
    const parsed = new URL(normalizeOllamaUrl(ollamaUrl))
    if (parsed.protocol !== 'http:') return null
    return 'This page is https and that Ollama address is http. iPhone Safari usually blocks the call. Open this app over http on the same Wi-Fi as Ollama.'
  } catch {
    return null
  }
}
