import { describe, expect, it } from 'vitest'
import {
  loadInferenceSettings,
  normalizeServiceUrl,
  PredictionError,
  requestPrediction,
  saveInferenceSettings,
  TOKEN_KEY,
  URL_KEY,
  type InferenceSettings,
} from './inference'
import { encodeWav } from './wav'

const settings: InferenceSettings = { url: 'https://pc.example.ts.net/transcribe', token: 'secret-token-123456' }
const wav = encodeWav(new Float32Array(1600), 16000)

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('REQ-INF-002 normalizeServiceUrl', () => {
  it('accepts https and appends the endpoint', () => {
    expect(normalizeServiceUrl('https://pc.example.ts.net')).toBe('https://pc.example.ts.net/transcribe')
    expect(normalizeServiceUrl(' https://pc.example.ts.net:8765/ ')).toBe('https://pc.example.ts.net:8765/transcribe')
    expect(normalizeServiceUrl('https://pc.example.ts.net/transcribe')).toBe('https://pc.example.ts.net/transcribe')
    expect(normalizeServiceUrl('https://pc.example.ts.net/api')).toBe('https://pc.example.ts.net/api/transcribe')
  })

  it('rejects http, invalid and credential URLs', () => {
    expect(() => normalizeServiceUrl('http://192.168.1.5:8765')).toThrow('https://')
    expect(() => normalizeServiceUrl('nicht-eine-url')).toThrow('gültige Adresse')
    expect(() => normalizeServiceUrl('https://user:pw@pc.example.ts.net')).toThrow('Zugangsdaten')
  })
})

describe('REQ-INF-001 settings', () => {
  it('stores URL and token only under the inference keys', () => {
    const storage = memoryStorage()
    saveInferenceSettings({ url: 'https://pc.example.ts.net', token: ' tok ' }, storage)
    expect([...storage.data.keys()].sort()).toEqual([TOKEN_KEY, URL_KEY].sort())
    expect(loadInferenceSettings(storage)).toEqual({ url: 'https://pc.example.ts.net/transcribe', token: 'tok' })
  })

  it('does not save anything when the URL is invalid', () => {
    const storage = memoryStorage()
    expect(() => saveInferenceSettings({ url: 'http://pc', token: 'tok' }, storage)).toThrow()
    expect(storage.data.size).toBe(0)
  })

  it('clears stored values when the fields are emptied', () => {
    const storage = memoryStorage()
    saveInferenceSettings({ url: 'https://pc.example.ts.net', token: 'tok' }, storage)
    saveInferenceSettings({ url: '', token: '' }, storage)
    expect(storage.data.size).toBe(0)
  })
})

describe('REQ-INF-003/006 requestPrediction', () => {
  it('posts the raw WAV with bearer token and parses the answer', async () => {
    let call: { url: string; init: RequestInit } | undefined
    const fetchFn = (async (url: string, init: RequestInit) => {
      call = { url, init }
      return json({ text: 'Wasser', latency_ms: 812.5, truncated: false, model_version: 'run-1' })
    }) as unknown as typeof fetch

    const result = await requestPrediction(wav, settings, { fetchFn })

    expect(call?.url).toBe(settings.url)
    expect(call?.init.method).toBe('POST')
    expect(call?.init.body).toBe(wav)
    expect(call?.init.headers).toEqual({ Authorization: `Bearer ${settings.token}`, 'Content-Type': 'audio/wav' })
    expect(result).toMatchObject({ text: 'Wasser', modelVersion: 'run-1', truncated: false, serverLatencyMs: 812.5 })
    expect(result.roundTripMs).toBeGreaterThanOrEqual(0)
  })

  it('reports a truncated prediction', async () => {
    const fetchFn = (async () => json({ text: 'abc', truncated: true })) as unknown as typeof fetch
    expect((await requestPrediction(wav, settings, { fetchFn })).truncated).toBe(true)
  })
})

describe('REQ-INF-004/005/007 errors', () => {
  async function kindOf(fetchFn: typeof fetch, options: { timeoutMs?: number } = {}) {
    try {
      await requestPrediction(wav, settings, { fetchFn, ...options })
    } catch (e) {
      expect(e).toBeInstanceOf(PredictionError)
      return (e as PredictionError).kind
    }
    return undefined
  }
  const status = (code: number, body: unknown = { error: 'Details vom Service' }) =>
    (async () => json(body, code)) as unknown as typeof fetch

  it('maps HTTP errors', async () => {
    expect(await kindOf(status(401))).toBe('unauthorized')
    expect(await kindOf(status(403))).toBe('forbidden')
    expect(await kindOf(status(413))).toBe('rejected')
    expect(await kindOf(status(422))).toBe('rejected')
    expect(await kindOf(status(500))).toBe('server')
  })

  it('shows the service message for rejected audio', async () => {
    await expect(requestPrediction(wav, settings, { fetchFn: status(422, { error: 'Sample rate is 44100 Hz' }) })).rejects
      .toThrow('Sample rate is 44100 Hz')
  })

  it('maps network failures, timeouts and invalid answers', async () => {
    expect(await kindOf((async () => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch)).toBe(
      'network',
    )
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })) as unknown as typeof fetch
    expect(await kindOf(hanging, { timeoutMs: 10 })).toBe('timeout')
    expect(await kindOf((async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch)).toBe(
      'invalid_response',
    )
    expect(await kindOf(status(200, { nope: 1 }))).toBe('invalid_response')
  })

  it('sends no request when not configured or when the audio is too long', async () => {
    let calls = 0
    const fetchFn = (async () => {
      calls++
      return json({ text: 'x' })
    }) as unknown as typeof fetch

    await expect(requestPrediction(wav, { url: '', token: '' }, { fetchFn })).rejects.toMatchObject({
      kind: 'not_configured',
    })
    const tooLong = encodeWav(new Float32Array(16000 * 31), 16000)
    await expect(requestPrediction(tooLong, settings, { fetchFn })).rejects.toMatchObject({ kind: 'too_long' })
    expect(calls).toBe(0)
  })
})
