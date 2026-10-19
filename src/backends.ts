import { ANALYSIS_PROMPT } from './prompt'
import { normalizeOllamaUrl } from './models'

export class AnalyzeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyzeError'
  }
}

function redact(text: string, secret?: string): string {
  let output = text.replace(/\s+/g, ' ').trim()
  if (secret) output = output.split(secret).join('[key]')
  output = output.replace(/AIza[0-9A-Za-z\-_]{8,}/g, '[key]')
  return output.slice(0, 320)
}

function timeoutSignal(ms: number, parent?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const onParent = () => controller.abort()
  parent?.addEventListener('abort', onParent)
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer)
      parent?.removeEventListener('abort', onParent)
    },
  }
}

async function errorText(response: Response, secret?: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } | string }
    if (typeof data.error === 'string') return redact(data.error, secret)
    if (data.error?.message) return redact(data.error.message, secret)
  } catch {
    // Fall through to status text.
  }
  return redact(response.statusText || `HTTP ${response.status}`, secret)
}

export function studioRequestBody(imageBase64: string, mimeType: string, prompt = ANALYSIS_PROMPT) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  }
}

export function ollamaRequestBody(imageBase64: string, model: string, prompt = ANALYSIS_PROMPT) {
  return {
    model,
    stream: false,
    format: 'json',
    messages: [
      {
        role: 'user',
        content: prompt,
        images: [imageBase64],
      },
    ],
    options: {
      temperature: 0.2,
      num_predict: 1200,
    },
  }
}

function studioText(data: {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  promptFeedback?: { blockReason?: string }
}): string {
  if (data.promptFeedback?.blockReason) {
    throw new AnalyzeError(`Google blocked the request (${data.promptFeedback.blockReason}).`)
  }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const visible = parts.filter((part) => part.text && part.thought !== true)
  const text = (visible.length ? visible : parts)
    .map((part) => part.text ?? '')
    .join('\n')
    .trim()
  if (!text) throw new AnalyzeError('AI Studio returned an empty reply.')
  return text
}

export async function completeStudio(options: {
  apiKey: string
  model: string
  imageBase64: string
  mimeType: string
  signal?: AbortSignal
}): Promise<string> {
  const key = options.apiKey.trim()
  if (!key) throw new AnalyzeError('Add an AI Studio key in Settings. It stays in this browser.')
  const model = options.model.trim() || 'gemma-4-31b-it'
  const timed = timeoutSignal(60_000, options.signal)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify(studioRequestBody(options.imageBase64, options.mimeType)),
        signal: timed.signal,
      },
    )
    if (!response.ok) {
      const detail = await errorText(response, key)
      if (response.status === 400 && /image input modality/i.test(detail)) {
        throw new AnalyzeError(
          `${model} refused the photo. Switch the AI Studio model to gemma-4-31b-it or gemma-4-26b-a4b-it.`,
        )
      }
      if (response.status === 400 && /api key/i.test(detail)) {
        throw new AnalyzeError('AI Studio rejected that key.')
      }
      if (response.status === 401 || response.status === 403) {
        throw new AnalyzeError('AI Studio rejected that key.')
      }
      if (response.status === 404) {
        throw new AnalyzeError(`AI Studio does not have a model named ${model}.`)
      }
      if (response.status === 429) {
        throw new AnalyzeError('AI Studio rate limit. Wait a minute and try the photo again.')
      }
      throw new AnalyzeError(`AI Studio error ${response.status}: ${detail}`)
    }
    return studioText((await response.json()) as Parameters<typeof studioText>[0])
  } catch (error) {
    if (error instanceof AnalyzeError) throw error
    if (options.signal?.aborted) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AnalyzeError('AI Studio took too long. Try the photo again.')
    }
    throw new AnalyzeError('Could not reach AI Studio. Check the connection and try again.')
  } finally {
    timed.done()
  }
}

export async function completeOllama(options: {
  url: string
  model: string
  imageBase64: string
  signal?: AbortSignal
}): Promise<string> {
  const base = normalizeOllamaUrl(options.url)
  const model = options.model.trim() || 'gemma3:4b'
  const timed = timeoutSignal(180_000, options.signal)
  try {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequestBody(options.imageBase64, model)),
      signal: timed.signal,
    })
    if (!response.ok) {
      const detail = await errorText(response)
      if (response.status === 404) {
        throw new AnalyzeError(`Ollama does not have ${model}. On that machine run: ollama pull ${model}`)
      }
      throw new AnalyzeError(`Ollama error ${response.status}: ${detail}`)
    }
    const data = (await response.json()) as { message?: { content?: string }; error?: string }
    if (data.error) throw new AnalyzeError(redact(data.error))
    const text = data.message?.content?.trim() ?? ''
    if (!text) throw new AnalyzeError('Ollama returned an empty reply.')
    return text
  } catch (error) {
    if (error instanceof AnalyzeError) throw error
    if (options.signal?.aborted) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AnalyzeError('Ollama took too long. The first photo can sit for a minute while the model loads.')
    }
    throw new AnalyzeError(
      'Could not reach Ollama. Check the address, that Ollama is running, and OLLAMA_ORIGINS. iPhone Safari blocks http Ollama from an https page.',
    )
  } finally {
    timed.done()
  }
}

export async function testOllama(url: string, model: string): Promise<string> {
  const base = normalizeOllamaUrl(url)
  const problem = (() => {
    try {
      const parsed = new URL(base)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'Use an http or https address.'
      return null
    } catch {
      return 'That Ollama address is not a URL.'
    }
  })()
  if (problem) throw new AnalyzeError(problem)
  let response: Response
  try {
    response = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(8000) })
  } catch {
    throw new AnalyzeError('Could not reach Ollama at that address.')
  }
  if (!response.ok) throw new AnalyzeError(`Ollama answered ${response.status} on /api/tags.`)
  const data = (await response.json()) as { models?: { name?: string; model?: string }[] }
  const names = (data.models ?? []).map((entry) => entry.name || entry.model || '')
  const wanted = model.trim()
  const installed = names.some((name) => name === wanted || name.startsWith(`${wanted}:`) || wanted.startsWith(name))
  if (!installed) {
    return `Ollama is up, but ${wanted} is not pulled yet. Run: ollama pull ${wanted}`
  }
  return `Ollama is up and ${wanted} is installed.`
}

export async function testStudio(apiKey: string, model: string): Promise<string> {
  const key = apiKey.trim()
  if (!key) throw new AnalyzeError('Paste a key first.')
  const id = model.trim() || 'gemma-4-31b-it'
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with exactly the word ready.' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 32 },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    )
  } catch {
    throw new AnalyzeError('Could not reach AI Studio.')
  }
  if (!response.ok) {
    const detail = await errorText(response, key)
    if (response.status === 401 || response.status === 403) throw new AnalyzeError('AI Studio rejected that key.')
    if (response.status === 404) throw new AnalyzeError(`AI Studio does not have a model named ${id}.`)
    throw new AnalyzeError(`AI Studio error ${response.status}: ${detail}`)
  }
  return `Key accepted for ${id}. This check sent text only. A house photo is the vision check.`
}
