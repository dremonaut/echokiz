export const URL_KEY = 'echokiz.inference.url'
export const TOKEN_KEY = 'echokiz.inference.token'
export const MAX_AUDIO_SECONDS = 30
export const DEFAULT_TIMEOUT_MS = 30_000

const ENDPOINT = '/transcribe'
const WAV_HEADER_BYTES = 44
const BYTES_PER_SECOND = 16_000 * 2

export interface InferenceSettings {
  url: string
  token: string
}

export interface Prediction {
  text: string
  modelVersion?: string
  truncated: boolean
  /** Client-side time from request to response, including network and inference. */
  roundTripMs: number
  serverLatencyMs?: number
}

export type PredictionErrorKind =
  | 'not_configured'
  | 'too_long'
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'rejected'
  | 'server'
  | 'invalid_response'

export class PredictionError extends Error {
  readonly kind: PredictionErrorKind

  constructor(kind: PredictionErrorKind, message: string) {
    super(message)
    this.name = 'PredictionError'
    this.kind = kind
  }
}

/** Accepts only https URLs; returns the full transcribe endpoint. Throws a German message otherwise. */
export function normalizeServiceUrl(input: string): string {
  const trimmed = input.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Das ist keine gültige Adresse. Beispiel: https://mein-pc.tailnet.ts.net')
  }
  if (url.protocol !== 'https:') {
    throw new Error('Nur Adressen mit https:// sind erlaubt, weil die App selbst über https läuft.')
  }
  if (url.username || url.password) throw new Error('Die Adresse darf keine Zugangsdaten enthalten.')
  url.hash = ''
  url.search = ''
  const path = url.pathname.replace(/\/+$/, '')
  url.pathname = path.endsWith(ENDPOINT) ? path : path + ENDPOINT
  return url.toString()
}

export function loadInferenceSettings(storage: Pick<Storage, 'getItem'> = localStorage): InferenceSettings {
  return { url: storage.getItem(URL_KEY) ?? '', token: storage.getItem(TOKEN_KEY) ?? '' }
}

/** Validates the URL first; nothing is stored if it is invalid. Returns what was stored. */
export function saveInferenceSettings(
  settings: InferenceSettings,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage,
): InferenceSettings {
  const url = settings.url.trim() ? normalizeServiceUrl(settings.url) : ''
  const token = settings.token.trim()
  if (url) storage.setItem(URL_KEY, url)
  else storage.removeItem(URL_KEY)
  if (token) storage.setItem(TOKEN_KEY, token)
  else storage.removeItem(TOKEN_KEY)
  return { url, token }
}

function wavSeconds(wav: ArrayBuffer): number {
  return Math.max(0, wav.byteLength - WAV_HEADER_BYTES) / BYTES_PER_SECOND
}

async function errorText(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : undefined
  } catch {
    return undefined
  }
}

export async function requestPrediction(
  wav: ArrayBuffer,
  settings: InferenceSettings,
  { timeoutMs = DEFAULT_TIMEOUT_MS, fetchFn = fetch }: { timeoutMs?: number; fetchFn?: typeof fetch } = {},
): Promise<Prediction> {
  if (!settings.url || !settings.token) {
    throw new PredictionError(
      'not_configured',
      'Der Vorhersage-Service ist nicht eingerichtet. Bitte Adresse und Token unter „Vorhersage-Service“ speichern.',
    )
  }
  if (wavSeconds(wav) > MAX_AUDIO_SECONDS) {
    throw new PredictionError(
      'too_long',
      `Die Aufnahme ist länger als ${MAX_AUDIO_SECONDS} Sekunden und kann nicht erkannt werden. Der Text kann von Hand eingegeben werden.`,
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = performance.now()
  let response: Response
  try {
    response = await fetchFn(settings.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.token}`, 'Content-Type': 'audio/wav' },
      body: wav,
      signal: controller.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new PredictionError(
        'timeout',
        `Der Service hat nicht innerhalb von ${Math.round(timeoutMs / 1000)} Sekunden geantwortet.`,
      )
    }
    throw new PredictionError(
      'network',
      'Der Service ist nicht erreichbar. Bitte Adresse (https, z. B. über Tailscale), laufenden Service und erlaubte Herkunft (Origin) prüfen.',
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const detail = await errorText(response)
    if (response.status === 401) {
      throw new PredictionError('unauthorized', 'Der Token wurde vom Service abgelehnt. Bitte den Token prüfen.')
    }
    if (response.status === 403) {
      throw new PredictionError('forbidden', 'Der Service erlaubt diese App-Adresse nicht (Origin).')
    }
    if (response.status >= 500) {
      throw new PredictionError('server', 'Der Service konnte die Aufnahme nicht verarbeiten (Serverfehler).')
    }
    throw new PredictionError(
      'rejected',
      `Der Service hat die Anfrage abgelehnt (${response.status})${detail ? `: ${detail}` : '.'}`,
    )
  }

  const roundTripMs = performance.now() - started
  let body: { text?: unknown; model_version?: unknown; truncated?: unknown; latency_ms?: unknown }
  try {
    body = await response.json()
  } catch {
    throw new PredictionError('invalid_response', 'Die Antwort des Services ist nicht lesbar.')
  }
  if (typeof body.text !== 'string') {
    throw new PredictionError('invalid_response', 'Die Antwort des Services enthält keinen Text.')
  }
  return {
    text: body.text,
    modelVersion: typeof body.model_version === 'string' ? body.model_version : undefined,
    truncated: body.truncated === true,
    roundTripMs,
    serverLatencyMs: typeof body.latency_ms === 'number' ? body.latency_ms : undefined,
  }
}
