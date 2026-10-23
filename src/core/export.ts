import { strToU8, zipSync, type Zippable } from 'fflate'
import { isUnlabeled, textSourceOf } from './labeling'
import type { Recording, Session, Speaker, TextSource } from './types'

export interface MetadataRow {
  file_name: string
  target_text: string
  category: string
  duration: number
  speaker_id: string
  session_id: string
  timestamp: string
  notes: string
  text_source?: TextSource
  predicted_text?: string
  model_version?: string
}

const BASE_COLUMNS: (keyof MetadataRow)[] = [
  'file_name',
  'target_text',
  'category',
  'duration',
  'speaker_id',
  'session_id',
  'timestamp',
  'notes',
]
const EXTRA_COLUMNS: (keyof MetadataRow)[] = ['text_source', 'predicted_text', 'model_version']

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
    text_source: textSourceOf(recording),
    predicted_text: recording.predictedText ?? '',
    model_version: recording.modelVersion ?? '',
  }
}

/** The text source columns are only written if some row needs them, so old-style exports stay unchanged. */
export function columnsFor(rows: MetadataRow[]): (keyof MetadataRow)[] {
  const extended = rows.some((row) => row.text_source !== undefined && row.text_source !== 'prompted')
  return extended ? [...BASE_COLUMNS, ...EXTRA_COLUMNS] : BASE_COLUMNS
}

/** Recordings without a text (free mode) are not exported. */
export function exportableRecordings(recordings: Recording[]): Recording[] {
  return recordings.filter((recording) => !isUnlabeled(recording))
}

function csvField(value: string | number): string {
  if (typeof value === 'number') return String(value)
  return `"${value.replace(/"/g, '""')}"`
}

export function toCsv(rows: MetadataRow[]): string {
  const columns = columnsFor(rows)
  const lines = [columns.join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvField(row[c] ?? '')).join(','))
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
  const sorted = exportableRecordings(recordings).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const rows = sorted.map(toMetadataRow)
  const columns = columnsFor(rows)
  const jsonRows = rows.map((row) => Object.fromEntries(columns.map((c) => [c, row[c]])))
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
          recordings: jsonRows,
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
