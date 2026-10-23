import { FREE_PHRASE_ID, type Recording, type TextSource } from './types'

export function textSourceOf(recording: Pick<Recording, 'textSource'>): TextSource {
  return recording.textSource ?? 'prompted'
}

/** A free recording that has no text yet; it is kept but not exported. */
export function isUnlabeled(recording: Pick<Recording, 'phraseId' | 'targetText'>): boolean {
  return recording.phraseId === FREE_PHRASE_ID && !recording.targetText.trim()
}

export interface Label {
  targetText: string
  textSource?: TextSource
}

/**
 * Turns the text saved by the user into a label. `targetText` is always the user's text,
 * never the prediction itself.
 */
export function resolveLabel(text: string, predictedText?: string): Label {
  const targetText = text.trim()
  if (!targetText) return { targetText: '' }
  if (predictedText === undefined) return { targetText, textSource: 'manual' }
  return { targetText, textSource: targetText === predictedText.trim() ? 'confirmed' : 'corrected' }
}

export const TEXT_SOURCE_LABELS: Record<TextSource, string> = {
  prompted: 'vorgegeben',
  confirmed: 'bestätigt',
  corrected: 'korrigiert',
  manual: 'eingegeben',
}
