import { describe, expect, it } from 'vitest'
import { CATEGORIES, DEFAULT_PHRASES, mergeCatalog } from './catalog'

describe('DEFAULT_PHRASES', () => {
  it('has unique IDs', () => {
    const ids = DEFAULT_PHRASES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique texts', () => {
    const texts = DEFAULT_PHRASES.map((p) => p.text.toLowerCase())
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('only uses known categories and every category has entries', () => {
    const used = new Set(DEFAULT_PHRASES.map((p) => p.category))
    expect([...used].every((c) => (CATEGORIES as readonly string[]).includes(c))).toBe(true)
    expect(CATEGORIES.every((c) => used.has(c))).toBe(true)
  })

  it('has trimmed text and an emoji for every entry', () => {
    for (const p of DEFAULT_PHRASES) {
      expect(p.text).toBe(p.text.trim())
      expect(p.text.length).toBeGreaterThan(0)
      expect(p.emoji).toBeTruthy()
    }
  })

  it('keeps the IDs of phrases from earlier catalog versions', () => {
    const ids = new Set(DEFAULT_PHRASES.map((p) => p.id))
    for (const id of ['w-mama', 'w-wasser', 'w-ja', 's-ich-habe-hunger', 's-ich-bin-muede', 'w-katze']) {
      expect(ids.has(id)).toBe(true)
    }
  })
})

describe('mergeCatalog', () => {
  it('appends custom phrases and ignores ID collisions with built-in ones', () => {
    const merged = mergeCatalog([
      { id: 'custom-1', text: 'Kuscheln', category: 'Signale', custom: true },
      { id: 'w-mama', text: 'Falsch', category: 'Personen', custom: true },
    ])
    expect(merged).toHaveLength(DEFAULT_PHRASES.length + 1)
    expect(merged.at(-1)?.id).toBe('custom-1')
    expect(merged.find((p) => p.id === 'w-mama')?.text).toBe('Mama')
  })
})
