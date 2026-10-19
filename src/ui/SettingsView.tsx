import { useState } from 'react'
import { testOllama, testStudio } from '../backends'
import { mixedContentRisk, validateOllamaUrl } from '../models'
import { OLLAMA_MODELS, STUDIO_MODELS, modelLikelyTextOnly } from '../prompt'
import type { BackendId, Settings } from '../types'

interface Props {
  settings: Settings
  apiKey: string
  onSettings: (settings: Settings) => void
  onApiKey: (key: string) => void
}

export function SettingsView({ settings, apiKey, onSettings, onApiKey }: Props) {
  const [showKey, setShowKey] = useState(false)
  const [check, setCheck] = useState('')
  const [checking, setChecking] = useState(false)
  const urlProblem = settings.backend === 'ollama' ? validateOllamaUrl(settings.ollamaUrl) : null
  const mixed =
    settings.backend === 'ollama' ? mixedContentRisk(window.location.protocol, settings.ollamaUrl) : null

  function setBackend(backend: BackendId) {
    onSettings({ ...settings, backend })
    setCheck('')
  }

  async function runOllamaTest() {
    setChecking(true)
    setCheck('')
    try {
      setCheck(await testOllama(settings.ollamaUrl, settings.ollamaModel))
    } catch (error) {
      setCheck(error instanceof Error ? error.message : 'Ollama did not answer.')
    } finally {
      setChecking(false)
    }
  }

  async function runStudioTest() {
    setChecking(true)
    setCheck('')
    try {
      setCheck(await testStudio(apiKey, settings.studioModel))
    } catch (error) {
      setCheck(error instanceof Error ? error.message : 'AI Studio did not answer.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="stack">
      <h1>Settings</h1>
      <p className="lede">
        Lead lists are the business. Demo and Private keep the photo on a machine you control. AI Studio is the option
        when you are out without that machine.
      </p>

      <div className="choices">
        <Choice
          pressed={settings.backend === 'demo'}
          title="Demo"
          body="Four public photos and hand-labeled readings. No key. Your own photos are refused."
          onClick={() => setBackend('demo')}
        />
        <Choice
          pressed={settings.backend === 'ollama'}
          title="Private"
          body="Gemma on an Ollama address you type. The photo goes there and nowhere else."
          onClick={() => setBackend('ollama')}
        />
        <Choice
          pressed={settings.backend === 'aistudio'}
          title="AI Studio"
          body="Hosted Gemma with your key. The photo is sent to Google. The key stays in this browser."
          onClick={() => setBackend('aistudio')}
        />
      </div>

      {settings.backend === 'ollama' && (
        <div className="card">
          <label className="field">
            <span>Ollama address</span>
            <input
              value={settings.ollamaUrl}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => onSettings({ ...settings, ollamaUrl: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Vision model</span>
            <input
              value={settings.ollamaModel}
              list="ollama-models"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => onSettings({ ...settings, ollamaModel: event.target.value })}
            />
            <datalist id="ollama-models">
              {OLLAMA_MODELS.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
          {modelLikelyTextOnly(settings.ollamaModel) && (
            <p className="banner">That tag is text-only. Vision starts at gemma3:4b.</p>
          )}
          {urlProblem && <p className="banner">{urlProblem}</p>}
          {mixed && <p className="banner">{mixed}</p>}
          <p className="fine">
            On the laptop: <code>ollama pull gemma3:4b</code>. For a phone on the same Wi-Fi, run{' '}
            <code>OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS=* ollama serve</code> and open this app over http. Do not
            expose port 11434 to the public internet.
          </p>
          <button type="button" className="btn ghost" disabled={checking} onClick={() => void runOllamaTest()}>
            {checking ? 'Checking…' : 'Test Ollama'}
          </button>
        </div>
      )}

      {settings.backend === 'aistudio' && (
        <div className="card">
          <label className="field">
            <span>AI Studio key</span>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Stored only in localStorage"
              onChange={(event) => onApiKey(event.target.value)}
            />
          </label>
          <button type="button" className="text-btn" onClick={() => setShowKey((value) => !value)}>
            {showKey ? 'Hide key' : 'Show key'}
          </button>
          <label className="field">
            <span>Vision model</span>
            <input
              value={settings.studioModel}
              list="studio-models"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => onSettings({ ...settings, studioModel: event.target.value })}
            />
            <datalist id="studio-models">
              {STUDIO_MODELS.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
          <p className="fine">
            Default is gemma-4-31b-it, which accepts images. If a photo is refused, switch to gemma-4-26b-a4b-it. The key
            is sent only as a header to Google and is never written into the repo.
          </p>
          <button type="button" className="btn ghost" disabled={checking} onClick={() => void runStudioTest()}>
            {checking ? 'Checking…' : 'Test key'}
          </button>
        </div>
      )}

      {check && <p className="banner">{check}</p>}

      <div className="card">
        <h2>Postcard signature</h2>
        <label className="field">
          <span>Your name</span>
          <input
            value={settings.buyer.name}
            onChange={(event) => onSettings({ ...settings, buyer: { ...settings.buyer, name: event.target.value } })}
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            type="tel"
            inputMode="tel"
            value={settings.buyer.phone}
            onChange={(event) => onSettings({ ...settings, buyer: { ...settings.buyer, phone: event.target.value } })}
          />
        </label>
        <label className="field">
          <span>City</span>
          <input
            value={settings.buyer.city}
            onChange={(event) => onSettings({ ...settings, buyer: { ...settings.buyer, city: event.target.value } })}
          />
        </label>
        <p className="fine">New notes pick this up. On an old lead, tap “Use standard note” to rewrite it.</p>
      </div>
    </section>
  )
}

function Choice({
  pressed,
  title,
  body,
  onClick,
}: {
  pressed: boolean
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button type="button" className={pressed ? 'choice on' : 'choice'} aria-pressed={pressed} onClick={onClick}>
      <strong>{title}</strong>
      <span>{body}</span>
    </button>
  )
}
