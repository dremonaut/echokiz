import { strToU8, zipSync, type Zippable } from 'fflate'
import type { Recording, Session, Speaker } from './types'

export interface MetadataRow {
  file_name: string
  target_text: string
  category: string
  duration: number
  speaker_id: string
  session_id: string
  timestamp: string
  notes: string
}

const COLUMNS: (keyof MetadataRow)[] = [
  'file_name',
  'target_text',
  'category',
  'duration',
  'speaker_id',
  'session_id',
  'timestamp',
  'notes',
]

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Path relative to metadata.csv, as expected by the Hugging Face `audiofolder` loader. */
export function recordingPath(recording: Recording): string {
  const date = recording.timestamp.slice(0, 10).replace(/-/g, '')
  const parts = [date, slugify(recording.targetText), slugify(recording.speakerId), String(recording.id ?? 0)]
  return `audio/${parts.filter(Boolean).join('_')}.wav`
}

export function toMetadataRow(recording: Recording): MetadataRow {
  return {
    file_name: recordingPath(recording),
    target_text: recording.targetText,
    category: recording.category,
    duration: Math.round(recording.duration * 100) / 100,
    speaker_id: recording.speakerId,
    session_id: recording.sessionId,
    timestamp: recording.timestamp,
    notes: recording.notes ?? '',
  }
}

function csvField(value: string | number): string {
  if (typeof value === 'number') return String(value)
  return `"${value.replace(/"/g, '""')}"`
}

export function toCsv(rows: MetadataRow[]): string {
  const lines = [COLUMNS.join(',')]
  for (const row of rows) lines.push(COLUMNS.map((c) => csvField(row[c])).join(','))
  return lines.join('\n') + '\n'
}

export interface ExportInput {
  recordings: Recording[]
  speakers: Speaker[]
  sessions: Session[]
}

/**
 * Builds a ZIP in Hugging Face `audiofolder` layout:
 *   metadata.csv, audio/*.wav, echokiz-export.json (full metadata incl. consent, for backup/import).
 */
export function buildDatasetZip({ recordings, speakers, sessions }: ExportInput): Uint8Array {
  const sorted = [...recordings].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const rows = sorted.map(toMetadataRow)
  const files: Zippable = {
    'metadata.csv': strToU8(toCsv(rows)),
    'echokiz-export.json': strToU8(
      JSON.stringify(
        {
          format: 'echokiz-export',
          version: 1,
          exportedAt: new Date().toISOString(),
          speakers,
          sessions,
          recordings: rows,
        },
        null,
        2,
      ),
    ),
  }
  // WAV is already uncompressed PCM; store without deflate to keep export fast.
  sorted.forEach((recording, i) => {
    files[rows[i].file_name] = [new Uint8Array(recording.wav), { level: 0 }]
  })
  return zipSync(files)
}
