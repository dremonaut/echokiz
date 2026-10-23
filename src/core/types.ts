export interface Consent {
  given: boolean
  timestamp: string
}

export interface Speaker {
  id: string
  createdAt: string
  consent: Consent
}

export interface Session {
  id: string
  speakerId: string
  startedAt: string
}

export interface Phrase {
  id: string
  text: string
  category: string
  emoji?: string
  custom?: boolean
}

/** `phraseId` and category of recordings made in free mode (no prompted phrase). */
export const FREE_PHRASE_ID = 'free'
export const FREE_CATEGORY = 'Freies Sprechen'

/** Where the `targetText` of a recording came from. Legacy recordings have none and count as `prompted`. */
export type TextSource = 'prompted' | 'confirmed' | 'corrected' | 'manual'

export interface Recording {
  id?: number
  speakerId: string
  sessionId: string
  phraseId: string
  targetText: string
  category: string
  notes?: string
  duration: number
  sampleRate: number
  timestamp: string
  device?: string
  textSource?: TextSource
  /** Text returned by the inference service; kept even if the user corrected it. */
  predictedText?: string
  modelVersion?: string
  /** 16-bit PCM WAV file content. Stored as ArrayBuffer for maximum browser compatibility. */
  wav: ArrayBuffer
}

export type RecordingFilter = Partial<Pick<Recording, 'speakerId' | 'sessionId'>>
