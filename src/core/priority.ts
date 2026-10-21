import type { Phrase } from './types'

/**
 * Picks the phrase with the fewest recordings, skipping the current one.
 * Ties are resolved in catalog order, starting right after the current phrase,
 * so equally recorded phrases rotate instead of alternating between two.
 */
export function pickNextPhrase(
  phrases: Phrase[],
  counts: ReadonlyMap<string, number>,
  currentId?: string,
): Phrase | undefined {
  const n = phrases.length
  if (!n) return undefined

  const currentIndex = phrases.findIndex((p) => p.id === currentId)
  let best: Phrase | undefined
  let bestCount = Infinity
  for (let step = 1; step <= n; step++) {
    const candidate = phrases[(currentIndex + step) % n]
    if (n > 1 && candidate.id === currentId) continue
    const count = counts.get(candidate.id) ?? 0
    if (count < bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/** Previous/next phrase in plain catalog order (wraps around). */
export function neighborPhrase(phrases: Phrase[], currentId: string | undefined, delta: 1 | -1): Phrase | undefined {
  const n = phrases.length
  if (!n) return undefined
  const currentIndex = phrases.findIndex((p) => p.id === currentId)
  return phrases[(Math.max(currentIndex, 0) + delta + n) % n]
}
