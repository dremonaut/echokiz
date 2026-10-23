import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import type { EchoKizStorage } from './storage'
import { createIdbStorage } from './storage-idb'
import type { Recording } from './types'
import { encodeWav } from './wav'

function recording(speakerId: string, sessionId: string, text = 'Wasser'): Recording {
  return {
    speakerId,
    sessionId,
    phraseId: 'w-wasser',
    targetText: text,
    category: 'Kernwörter',
    duration: 1,
    sampleRate: 16000,
    timestamp: new Date().toISOString(),
    wav: encodeWav(new Float32Array(16), 16000),
  }
}

describe('IndexedDB storage', () => {
  let storage: EchoKizStorage

  beforeEach(async () => {
    storage = await createIdbStorage(new IDBFactory())
  })

  it('stores and lists recordings with audio', async () => {
    const id = await storage.saveRecording(recording('Kind_01', 's1'))
    expect(typeof id).toBe('number')

    const stored = await storage.getRecording(id)
    expect(stored?.targetText).toBe('Wasser')
    expect(stored?.wav.byteLength).toBe(44 + 32)
  })

  it('filters recordings by speaker and session', async () => {
    await storage.saveRecording(recording('Kind_01', 's1'))
    await storage.saveRecording(recording('Kind_01', 's2'))
    await storage.saveRecording(recording('Kind_02', 's3'))

    expect(await storage.listRecordings()).toHaveLength(3)
    expect(await storage.listRecordings({ speakerId: 'Kind_01' })).toHaveLength(2)
    expect(await storage.listRecordings({ sessionId: 's2' })).toHaveLength(1)
    expect(await storage.listRecordings({ speakerId: 'Kind_02', sessionId: 's1' })).toHaveLength(0)
  })

  it('updates a recording when saved with an existing id', async () => {
    const id = await storage.saveRecording(recording('Kind_01', 's1'))
    const stored = (await storage.getRecording(id))!
    await storage.saveRecording({ ...stored, notes: 'Wassa' })
    expect((await storage.getRecording(id))?.notes).toBe('Wassa')
    expect(await storage.listRecordings()).toHaveLength(1)
  })

  it('REQ-STO-002/003 stores the optional text source fields and still reads records without them', async () => {
    const legacyId = await storage.saveRecording(recording('Kind_01', 's1'))
    const freeId = await storage.saveRecording({
      ...recording('Kind_01', 's1', ''),
      phraseId: 'free',
      textSource: 'corrected',
      predictedText: 'Wasa',
      modelVersion: 'run-1',
    })
    expect(await storage.getRecording(legacyId)).not.toHaveProperty('textSource')
    expect(await storage.getRecording(freeId)).toMatchObject({
      textSource: 'corrected',
      predictedText: 'Wasa',
      modelVersion: 'run-1',
    })
  })

  it('deletes a speaker with all sessions and recordings', async () => {
    const consent = { given: true, timestamp: new Date().toISOString() }
    await storage.saveSpeaker({ id: 'Kind_01', createdAt: consent.timestamp, consent })
    await storage.saveSpeaker({ id: 'Kind_02', createdAt: consent.timestamp, consent })
    await storage.saveSession({ id: 's1', speakerId: 'Kind_01', startedAt: consent.timestamp })
    await storage.saveSession({ id: 's2', speakerId: 'Kind_02', startedAt: consent.timestamp })
    await storage.saveRecording(recording('Kind_01', 's1'))
    await storage.saveRecording(recording('Kind_02', 's2'))

    await storage.deleteSpeaker('Kind_01')

    expect((await storage.listSpeakers()).map((s) => s.id)).toEqual(['Kind_02'])
    expect((await storage.listSessions()).map((s) => s.id)).toEqual(['s2'])
    expect((await storage.listRecordings()).map((r) => r.speakerId)).toEqual(['Kind_02'])
  })

  it('manages custom phrases', async () => {
    await storage.savePhrase({ id: 'custom-1', text: 'Kuscheln', category: 'Kernwörter', custom: true })
    expect(await storage.listPhrases()).toHaveLength(1)
    await storage.deletePhrase('custom-1')
    expect(await storage.listPhrases()).toHaveLength(0)
  })
})
