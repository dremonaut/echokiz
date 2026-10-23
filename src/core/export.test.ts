import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildDatasetZip, exportableRecordings, recordingPath, slugify, toCsv, toMetadataRow } from './export'
import type { Recording } from './types'
import { encodeWav } from './wav'

function recording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 7,
    speakerId: 'Kind_01',
    sessionId: 'Kind_01_Session_01',
    phraseId: 's-ich-moechte-wasser',
    targetText: 'Ich möchte Wasser',
    category: 'Sätze',
    duration: 3.104,
    sampleRate: 16000,
    timestamp: '2026-10-20T19:45:12.000Z',
    wav: encodeWav(new Float32Array(160), 16000),
    ...overrides,
  }
}

describe('slugify', () => {
  it('transliterates umlauts and removes special characters', () => {
    expect(slugify('Ich möchte Wasser!')).toBe('ich_moechte_wasser')
    expect(slugify('Straße & Überweg')).toBe('strasse_ueberweg')
    expect(slugify('  Kind_01 ')).toBe('kind_01')
  })
})

describe('metadata', () => {
  it('uses audio/ paths relative to metadata.csv', () => {
    expect(recordingPath(recording())).toBe('audio/20261020_ich_moechte_wasser_kind_01_7.wav')
  })

  it('escapes quotes in CSV and rounds durations', () => {
    const csv = toCsv([toMetadataRow(recording({ notes: 'sagt "Wassa"' }))])
    const [header, line] = csv.trim().split('\n')
    expect(header).toBe('file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes')
    expect(line).toBe(
      '"audio/20261020_ich_moechte_wasser_kind_01_7.wav","Ich möchte Wasser","Sätze",3.1,' +
        '"Kind_01","Kind_01_Session_01","2026-10-20T19:45:12.000Z","sagt ""Wassa"""',
    )
  })
  it('REQ-EXP-006 appends text source columns only when needed', () => {
    const prompted = toCsv([toMetadataRow(recording())])
    expect(prompted.split('\n')[0]).toBe('file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes')

    const rows = [
      toMetadataRow(recording()),
      toMetadataRow(
        recording({
          id: 8,
          phraseId: 'free',
          targetText: 'Wasser',
          textSource: 'corrected',
          predictedText: 'Wasa',
          modelVersion: 'run-1',
        }),
      ),
    ]
    const [header, legacy, corrected] = toCsv(rows).trim().split('\n')
    expect(header).toBe(
      'file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes,text_source,predicted_text,model_version',
    )
    expect(legacy).toMatch(/,"","prompted","",""$/)
    expect(corrected).toMatch(/,"","corrected","Wasa","run-1"$/)
  })
})

describe('buildDatasetZip', () => {
  it('REQ-EXP-006 keeps the old layout for prompted-only exports', () => {
    const files = unzipSync(buildDatasetZip({ recordings: [recording()], speakers: [], sessions: [] }))
    const csv = strFromU8(files['metadata.csv']).split('\n')[0]
    expect(csv).toBe('file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes')
    const json = JSON.parse(strFromU8(files['echokiz-export.json']))
    expect(Object.keys(json.recordings[0])).toEqual(csv.split(','))
  })

  it('REQ-EXP-006 writes the same new keys to CSV and JSON', () => {
    const free = recording({
      id: 9,
      phraseId: 'free',
      targetText: 'Wasser',
      textSource: 'confirmed',
      predictedText: 'Wasser',
      modelVersion: 'run-1',
    })
    const files = unzipSync(buildDatasetZip({ recordings: [recording(), free], speakers: [], sessions: [] }))
    const json = JSON.parse(strFromU8(files['echokiz-export.json']))
    expect(json.version).toBe(1)
    expect(json.recordings[0]).toMatchObject({ text_source: 'prompted', predicted_text: '', model_version: '' })
    expect(json.recordings[1]).toMatchObject({
      text_source: 'confirmed',
      predicted_text: 'Wasser',
      model_version: 'run-1',
    })
    expect(strFromU8(files['metadata.csv']).split('\n')[0]).toBe(Object.keys(json.recordings[0]).join(','))
  })

  it('REQ-EXP-007 excludes free recordings without text', () => {
    const unlabeled = recording({ id: 10, phraseId: 'free', targetText: '', category: 'Freies Sprechen' })
    const files = unzipSync(buildDatasetZip({ recordings: [recording(), unlabeled], speakers: [], sessions: [] }))

    expect(Object.keys(files).filter((name) => name.startsWith('audio/'))).toHaveLength(1)
    expect(strFromU8(files['metadata.csv']).trim().split('\n')).toHaveLength(2)
    expect(JSON.parse(strFromU8(files['echokiz-export.json'])).recordings).toHaveLength(1)
    expect(exportableRecordings([recording(), unlabeled])).toHaveLength(1)
  })

  it('REQ-EXP-008 never contains the service settings', () => {
    const files = unzipSync(buildDatasetZip({ recordings: [recording()], speakers: [], sessions: [] }))
    for (const name of ['metadata.csv', 'echokiz-export.json']) {
      expect(strFromU8(files[name])).not.toMatch(/token|echokiz\.inference/i)
    }
  })

  it('creates an audiofolder-compatible archive', () => {
    const recs = [recording(), recording({ id: 8, targetText: 'Apfel', timestamp: '2026-10-20T19:40:00.000Z' })]
    const files = unzipSync(buildDatasetZip({ recordings: recs, speakers: [], sessions: [] }))

    expect(Object.keys(files).sort()).toEqual([
      'audio/20261020_apfel_kind_01_8.wav',
      'audio/20261020_ich_moechte_wasser_kind_01_7.wav',
      'echokiz-export.json',
      'metadata.csv',
    ])
    const csv = strFromU8(files['metadata.csv']).trim().split('\n')
    expect(csv).toHaveLength(3)
    // Sorted chronologically
    expect(csv[1]).toContain('Apfel')
    expect(files['audio/20261020_apfel_kind_01_8.wav'].byteLength).toBe(44 + 320)

    const json = JSON.parse(strFromU8(files['echokiz-export.json']))
    expect(json.format).toBe('echokiz-export')
    expect(json.recordings).toHaveLength(2)
  })
})
