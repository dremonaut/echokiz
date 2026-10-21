import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildDatasetZip, recordingPath, slugify, toCsv, toMetadataRow } from './export'
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
})

describe('buildDatasetZip', () => {
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
