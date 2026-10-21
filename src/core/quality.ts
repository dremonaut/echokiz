export interface QualityOptions {
  minDuration?: number
  /** Peak level below which a recording is considered too quiet. */
  minPeak?: number
  /** Absolute sample value treated as clipping. */
  clipLevel?: number
  /** Fraction of clipped samples tolerated. */
  maxClipRatio?: number
}

export type QualityIssue = 'zu_kurz' | 'zu_leise' | 'uebersteuert'

export interface QualityReport {
  duration: number
  peak: number
  rms: number
  issues: QualityIssue[]
  ok: boolean
}

export const QUALITY_MESSAGES: Record<QualityIssue, string> = {
  zu_kurz: 'Die Aufnahme ist sehr kurz.',
  zu_leise: 'Die Aufnahme ist sehr leise.',
  uebersteuert: 'Die Aufnahme ist übersteuert (zu laut).',
}

export function analyzeQuality(
  samples: Float32Array,
  sampleRate: number,
  { minDuration = 0.3, minPeak = 0.05, clipLevel = 0.99, maxClipRatio = 0.001 }: QualityOptions = {},
): QualityReport {
  let peak = 0
  let sumSquares = 0
  let clipped = 0
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i])
    if (a > peak) peak = a
    if (a >= clipLevel) clipped++
    sumSquares += samples[i] * samples[i]
  }
  const duration = samples.length / sampleRate
  const rms = samples.length ? Math.sqrt(sumSquares / samples.length) : 0

  const issues: QualityIssue[] = []
  if (duration < minDuration) issues.push('zu_kurz')
  if (peak < minPeak) issues.push('zu_leise')
  if (samples.length && clipped / samples.length > maxClipRatio) issues.push('uebersteuert')

  return { duration, peak, rms, issues, ok: issues.length === 0 }
}

export interface TrimOptions {
  /** Frame RMS above this level counts as speech. */
  threshold?: number
  frameMs?: number
  /** Silence kept before and after the detected speech. */
  padMs?: number
}

/**
 * Removes leading/trailing silence while keeping a short padding.
 * Returns the input unchanged if no speech is detected.
 */
export function trimSilence(
  samples: Float32Array,
  sampleRate: number,
  { threshold = 0.02, frameMs = 20, padMs = 300 }: TrimOptions = {},
): Float32Array {
  const frame = Math.max(1, Math.round((sampleRate * frameMs) / 1000))
  let first = -1
  let last = -1
  for (let start = 0; start < samples.length; start += frame) {
    const end = Math.min(samples.length, start + frame)
    let sum = 0
    for (let i = start; i < end; i++) sum += samples[i] * samples[i]
    if (Math.sqrt(sum / (end - start)) >= threshold) {
      if (first < 0) first = start
      last = end
    }
  }
  if (first < 0) return samples

  const pad = Math.round((sampleRate * padMs) / 1000)
  return samples.slice(Math.max(0, first - pad), Math.min(samples.length, last + pad))
}
