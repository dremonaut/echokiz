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
  /** 16-bit PCM WAV file content. Stored as ArrayBuffer for maximum browser compatibility. */
  wav: ArrayBuffer
}

export type RecordingFilter = Partial<Pick<Recording, 'speakerId' | 'sessionId'>>
