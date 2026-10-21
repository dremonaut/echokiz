import type { Phrase, Recording, RecordingFilter, Session, Speaker } from './types'

/**
 * Storage abstraction used by the UI. The default implementation is IndexedDB
 * (see storage-idb.ts); a backend implementation can be added later without UI changes.
 */
export interface EchoKizStorage {
  saveSpeaker(speaker: Speaker): Promise<void>
  listSpeakers(): Promise<Speaker[]>
  /** Deletes the speaker together with all sessions and recordings. */
  deleteSpeaker(id: string): Promise<void>

  saveSession(session: Session): Promise<void>
  listSessions(speakerId?: string): Promise<Session[]>

  saveRecording(recording: Recording): Promise<number>
  getRecording(id: number): Promise<Recording | undefined>
  listRecordings(filter?: RecordingFilter): Promise<Recording[]>
  deleteRecording(id: number): Promise<void>

  savePhrase(phrase: Phrase): Promise<void>
  listPhrases(): Promise<Phrase[]>
  deletePhrase(id: string): Promise<void>
}
