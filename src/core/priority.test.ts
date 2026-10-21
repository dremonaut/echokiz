import { describe, expect, it } from 'vitest'
import { neighborPhrase, pickNextPhrase } from './priority'
import type { Phrase } from './types'

const phrases: Phrase[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id, category: 'Kernwörter' }))
const counts = (entries: Record<string, number>) => new Map(Object.entries(entries))

describe('pickNextPhrase', () => {
  it('returns nothing for an empty catalog', () => {
    expect(pickNextPhrase([], counts({}))).toBeUndefined()
  })

  it('starts with the first phrase when nothing is recorded yet', () => {
    expect(pickNextPhrase(phrases, counts({}))?.id).toBe('a')
  })

  it('prefers the least recorded phrase', () => {
    const next = pickNextPhrase(phrases, counts({ a: 3, b: 2, c: 1, d: 3 }), 'a')
    expect(next?.id).toBe('c')
  })

  it('treats phrases without recordings as zero', () => {
    const next = pickNextPhrase(phrases, counts({ a: 1, b: 1, c: 1 }), 'a')
    expect(next?.id).toBe('d')
  })

  it('never returns the current phrase when others exist', () => {
    expect(pickNextPhrase(phrases, counts({ a: 0, b: 5, c: 5, d: 5 }), 'a')?.id).not.toBe('a')
  })

  it('rotates through equally recorded phrases in catalog order', () => {
    const equal = counts({ a: 1, b: 1, c: 1, d: 1 })
    expect(pickNextPhrase(phrases, equal, 'a')?.id).toBe('b')
    expect(pickNextPhrase(phrases, equal, 'c')?.id).toBe('d')
    expect(pickNextPhrase(phrases, equal, 'd')?.id).toBe('a')
  })

  it('returns the only phrase if the catalog has a single entry', () => {
    expect(pickNextPhrase([phrases[0]], counts({ a: 2 }), 'a')?.id).toBe('a')
  })

  it('falls back to the least recorded phrase if the current one is unknown', () => {
    expect(pickNextPhrase(phrases, counts({ a: 2, b: 0 }), 'gone')?.id).toBe('b')
  })
})

describe('neighborPhrase', () => {
  it('moves forward and backward and wraps around', () => {
    expect(neighborPhrase(phrases, 'b', 1)?.id).toBe('c')
    expect(neighborPhrase(phrases, 'b', -1)?.id).toBe('a')
    expect(neighborPhrase(phrases, 'd', 1)?.id).toBe('a')
    expect(neighborPhrase(phrases, 'a', -1)?.id).toBe('d')
  })
})
