import type { EchoKizStorage } from './storage'
import type { Phrase, Recording, RecordingFilter, Session, Speaker } from './types'

export const DB_NAME = 'echokiz'
export const DB_VERSION = 1

type StoreName = 'speakers' | 'sessions' | 'recordings' | 'phrases'

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaktion abgebrochen'))
  })
}

export function openDatabase(factory: IDBFactory = indexedDB, name = DB_NAME): Promise<IDBDatabase> {
  const request = factory.open(name, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    // Add future schema migrations here, guarded by event.oldVersion.
    db.createObjectStore('speakers', { keyPath: 'id' })
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
    sessions.createIndex('speakerId', 'speakerId')
    const recordings = db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true })
    recordings.createIndex('speakerId', 'speakerId')
    recordings.createIndex('sessionId', 'sessionId')
    db.createObjectStore('phrases', { keyPath: 'id' })
  }
  return promisify(request)
}

export async function createIdbStorage(
  factory: IDBFactory = indexedDB,
  name = DB_NAME,
): Promise<EchoKizStorage> {
  const db = await openDatabase(factory, name)

  async function put(store: StoreName, value: unknown): Promise<IDBValidKey> {
    const tx = db.transaction(store, 'readwrite')
    const request = tx.objectStore(store).put(value)
    await done(tx)
    return request.result
  }

  async function getAll<T>(store: StoreName, index?: string, query?: IDBValidKey): Promise<T[]> {
    const tx = db.transaction(store, 'readonly')
    const source = index ? tx.objectStore(store).index(index) : tx.objectStore(store)
    return promisify(source.getAll(query)) as Promise<T[]>
  }

  async function remove(store: StoreName, key: IDBValidKey): Promise<void> {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    await done(tx)
  }

  return {
    async saveSpeaker(speaker: Speaker) {
      await put('speakers', speaker)
    },
    listSpeakers: () => getAll<Speaker>('speakers'),
    async deleteSpeaker(id: string) {
      const tx = db.transaction(['speakers', 'sessions', 'recordings'], 'readwrite')
      tx.objectStore('speakers').delete(id)
      for (const storeName of ['sessions', 'recordings'] as const) {
        const store = tx.objectStore(storeName)
        // Use callbacks (no await) so the transaction stays active.
        const request = store.index('speakerId').getAllKeys(id)
        request.onsuccess = () => request.result.forEach((key) => store.delete(key))
      }
      await done(tx)
    },

    async saveSession(session: Session) {
      await put('sessions', session)
    },
    listSessions: (speakerId?: string) =>
      speakerId ? getAll<Session>('sessions', 'speakerId', speakerId) : getAll<Session>('sessions'),

    async saveRecording(recording: Recording) {
      return (await put('recordings', recording)) as number
    },
    async getRecording(id: number) {
      const tx = db.transaction('recordings', 'readonly')
      return promisify(tx.objectStore('recordings').get(id)) as Promise<Recording | undefined>
    },
    async listRecordings(filter: RecordingFilter = {}) {
      let result: Recording[]
      if (filter.sessionId) result = await getAll<Recording>('recordings', 'sessionId', filter.sessionId)
      else if (filter.speakerId) result = await getAll<Recording>('recordings', 'speakerId', filter.speakerId)
      else result = await getAll<Recording>('recordings')
      if (filter.speakerId) result = result.filter((r) => r.speakerId === filter.speakerId)
      return result
    },
    deleteRecording: (id: number) => remove('recordings', id),

    async savePhrase(phrase: Phrase) {
      await put('phrases', phrase)
    },
    listPhrases: () => getAll<Phrase>('phrases'),
    deletePhrase: (id: string) => remove('phrases', id),
  }
}
