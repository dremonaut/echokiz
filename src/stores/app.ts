import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { createCustomPhrase, mergeCatalog } from '../core/catalog'
import { isUnlabeled } from '../core/labeling'
import type { EchoKizStorage } from '../core/storage'
import { createIdbStorage } from '../core/storage-idb'
import type { Phrase, Recording, Session, Speaker } from '../core/types'

export const REPETITIONS_PER_PHRASE = 3

export const useAppStore = defineStore('app', () => {
  const storage = shallowRef<EchoKizStorage>()
  const ready = ref(false)
  const error = ref<string>()

  const speakers = ref<Speaker[]>([])
  const customPhrases = ref<Phrase[]>([])
  const currentSpeakerId = ref<string>()
  const currentSession = ref<Session>()
  /** Recording metadata of the current speaker (without audio, to keep memory low). */
  const recordings = ref<Omit<Recording, 'wav'>[]>([])

  const phrases = computed(() => mergeCatalog(customPhrases.value))
  const currentSpeaker = computed(() => speakers.value.find((s) => s.id === currentSpeakerId.value))
  const countsByPhrase = computed(() => {
    const counts = new Map<string, number>()
    for (const r of recordings.value) counts.set(r.phraseId, (counts.get(r.phraseId) ?? 0) + 1)
    return counts
  })
  const unlabeledCount = computed(() => recordings.value.filter(isUnlabeled).length)

  function db(): EchoKizStorage {
    if (!storage.value) throw new Error('Speicher ist noch nicht bereit')
    return storage.value
  }

  async function init(customStorage?: EchoKizStorage) {
    if (ready.value) return
    try {
      storage.value = customStorage ?? (await createIdbStorage())
      speakers.value = (await db().listSpeakers()).sort((a, b) => a.id.localeCompare(b.id))
      customPhrases.value = await db().listPhrases()
      const last = localStorage.getItem('echokiz.speaker')
      if (last && speakers.value.some((s) => s.id === last)) await selectSpeaker(last)
      ready.value = true
    } catch (e) {
      error.value = `Lokaler Speicher (IndexedDB) nicht verfügbar: ${(e as Error).message}`
    }
  }

  async function addSpeaker(id: string, consentGiven: boolean) {
    const trimmed = id.trim()
    if (!trimmed) throw new Error('Bitte eine Sprecher-ID angeben.')
    if (!consentGiven) throw new Error('Ohne Einwilligung der Erziehungsberechtigten keine Aufnahmen.')
    if (speakers.value.some((s) => s.id === trimmed)) throw new Error('Diese Sprecher-ID existiert bereits.')
    const now = new Date().toISOString()
    const speaker: Speaker = { id: trimmed, createdAt: now, consent: { given: true, timestamp: now } }
    await db().saveSpeaker(speaker)
    speakers.value = [...speakers.value, speaker].sort((a, b) => a.id.localeCompare(b.id))
    await selectSpeaker(trimmed)
  }

  async function selectSpeaker(id: string) {
    currentSpeakerId.value = id
    currentSession.value = undefined
    localStorage.setItem('echokiz.speaker', id)
    await refreshRecordings()
  }

  async function deleteSpeaker(id: string) {
    await db().deleteSpeaker(id)
    speakers.value = speakers.value.filter((s) => s.id !== id)
    if (currentSpeakerId.value === id) {
      currentSpeakerId.value = undefined
      currentSession.value = undefined
      recordings.value = []
      localStorage.removeItem('echokiz.speaker')
    }
  }

  async function ensureSession(): Promise<Session> {
    if (!currentSpeakerId.value) throw new Error('Kein Sprecher ausgewählt.')
    if (currentSession.value) return currentSession.value
    const sessions = await db().listSessions(currentSpeakerId.value)
    // Session IDs are global keys, so they include the speaker ID.
    const session: Session = {
      id: `${currentSpeakerId.value}_Session_${String(sessions.length + 1).padStart(2, '0')}`,
      speakerId: currentSpeakerId.value,
      startedAt: new Date().toISOString(),
    }
    await db().saveSession(session)
    currentSession.value = session
    return session
  }

  async function refreshRecordings() {
    if (!currentSpeakerId.value) {
      recordings.value = []
      return
    }
    const all = await db().listRecordings({ speakerId: currentSpeakerId.value })
    recordings.value = all
      .map(({ wav: _wav, ...meta }) => meta)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  async function saveRecording(recording: Omit<Recording, 'id'>): Promise<number> {
    const id = await db().saveRecording(recording)
    const { wav: _wav, ...meta } = recording
    recordings.value = [...recordings.value, { ...meta, id }]
    return id
  }

  /** Updates the label and notes of a recording; `phraseId` (and thus the repetition count) stays unchanged. */
  async function updateRecording(
    id: number,
    changes: Partial<Pick<Recording, 'targetText' | 'notes' | 'textSource' | 'predictedText' | 'modelVersion'>>,
  ) {
    const recording = await db().getRecording(id)
    if (!recording) return
    Object.assign(recording, changes)
    await db().saveRecording(recording)
    recordings.value = recordings.value.map((r) => (r.id === id ? { ...r, ...changes } : r))
  }

  async function deleteRecording(id: number) {
    await db().deleteRecording(id)
    recordings.value = recordings.value.filter((r) => r.id !== id)
  }

  async function getWav(id: number): Promise<ArrayBuffer | undefined> {
    return (await db().getRecording(id))?.wav
  }

  async function addPhrase(text: string, category: string, emoji?: string) {
    if (!text.trim()) throw new Error('Bitte einen Text eingeben.')
    const phrase = createCustomPhrase(text, category, emoji || undefined)
    await db().savePhrase(phrase)
    customPhrases.value = [...customPhrases.value, phrase]
  }

  async function deletePhrase(id: string) {
    await db().deletePhrase(id)
    customPhrases.value = customPhrases.value.filter((p) => p.id !== id)
  }

  return {
    storage,
    ready,
    error,
    speakers,
    phrases,
    customPhrases,
    currentSpeakerId,
    currentSpeaker,
    currentSession,
    recordings,
    countsByPhrase,
    unlabeledCount,
    db,
    init,
    addSpeaker,
    selectSpeaker,
    deleteSpeaker,
    ensureSession,
    refreshRecordings,
    saveRecording,
    updateRecording,
    deleteRecording,
    getWav,
    addPhrase,
    deletePhrase,
  }
})
