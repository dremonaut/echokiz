import type { Phrase } from './types'

export const CATEGORIES = ['Kernwörter', 'Sätze', 'Laute'] as const

export const DEFAULT_PHRASES: Phrase[] = [
  { id: 'w-mama', text: 'Mama', category: 'Kernwörter', emoji: '👩' },
  { id: 'w-papa', text: 'Papa', category: 'Kernwörter', emoji: '👨' },
  { id: 'w-ja', text: 'Ja', category: 'Kernwörter', emoji: '👍' },
  { id: 'w-nein', text: 'Nein', category: 'Kernwörter', emoji: '👎' },
  { id: 'w-wasser', text: 'Wasser', category: 'Kernwörter', emoji: '💧' },
  { id: 'w-essen', text: 'Essen', category: 'Kernwörter', emoji: '🍽️' },
  { id: 'w-apfel', text: 'Apfel', category: 'Kernwörter', emoji: '🍎' },
  { id: 'w-ball', text: 'Ball', category: 'Kernwörter', emoji: '⚽' },
  { id: 'w-hund', text: 'Hund', category: 'Kernwörter', emoji: '🐶' },
  { id: 'w-katze', text: 'Katze', category: 'Kernwörter', emoji: '🐱' },
  { id: 'w-auto', text: 'Auto', category: 'Kernwörter', emoji: '🚗' },
  { id: 'w-mehr', text: 'Mehr', category: 'Kernwörter', emoji: '➕' },
  { id: 'w-fertig', text: 'Fertig', category: 'Kernwörter', emoji: '✅' },
  { id: 'w-hilfe', text: 'Hilfe', category: 'Kernwörter', emoji: '🆘' },
  { id: 's-ich-moechte-wasser', text: 'Ich möchte Wasser', category: 'Sätze', emoji: '🥤' },
  { id: 's-ich-habe-hunger', text: 'Ich habe Hunger', category: 'Sätze', emoji: '😋' },
  { id: 's-ich-bin-muede', text: 'Ich bin müde', category: 'Sätze', emoji: '😴' },
  { id: 's-ich-muss-aufs-klo', text: 'Ich muss aufs Klo', category: 'Sätze', emoji: '🚽' },
  { id: 's-mir-tut-was-weh', text: 'Mir tut etwas weh', category: 'Sätze', emoji: '🤕' },
  { id: 's-ich-will-spielen', text: 'Ich will spielen', category: 'Sätze', emoji: '🧸' },
  { id: 'l-a', text: 'a', category: 'Laute', emoji: '🅰️' },
  { id: 'l-sch', text: 'sch', category: 'Laute', emoji: '🤫' },
  { id: 'l-s', text: 's', category: 'Laute', emoji: '🐍' },
  { id: 'l-k', text: 'k', category: 'Laute', emoji: '🔑' },
]

/** Merges built-in phrases with user-defined phrases (custom ones last). */
export function mergeCatalog(custom: Phrase[]): Phrase[] {
  const ids = new Set(DEFAULT_PHRASES.map((p) => p.id))
  return [...DEFAULT_PHRASES, ...custom.filter((p) => !ids.has(p.id))]
}

export function createCustomPhrase(text: string, category: string, emoji?: string): Phrase {
  return { id: `custom-${crypto.randomUUID()}`, text: text.trim(), category, emoji, custom: true }
}
