import { describe, expect, it } from 'vitest'
import { isUnlabeled, resolveLabel, textSourceOf } from './labeling'
import { FREE_PHRASE_ID } from './types'

describe('REQ-STO-003 textSourceOf', () => {
  it('treats legacy records without a source as prompted', () => {
    expect(textSourceOf({})).toBe('prompted')
    expect(textSourceOf({ textSource: 'corrected' })).toBe('corrected')
  })
})

describe('REQ-REC-010 resolveLabel', () => {
  it('confirms an unchanged prediction', () => {
    expect(resolveLabel('Wasser haben', 'Wasser haben')).toEqual({ targetText: 'Wasser haben', textSource: 'confirmed' })
  })

  it('ignores surrounding whitespace when comparing', () => {
    expect(resolveLabel('  Wasser haben ', 'Wasser haben ')).toEqual({
      targetText: 'Wasser haben',
      textSource: 'confirmed',
    })
  })

  it('uses the corrected text as target text, never the prediction', () => {
    expect(resolveLabel('Wasser', 'Wasa')).toEqual({ targetText: 'Wasser', textSource: 'corrected' })
  })

  it('counts a change in casing or punctuation as correction', () => {
    expect(resolveLabel('wasser', 'Wasser').textSource).toBe('corrected')
    expect(resolveLabel('Wasser.', 'Wasser').textSource).toBe('corrected')
  })

  it('marks text without a prediction as manual', () => {
    expect(resolveLabel('Apfel')).toEqual({ targetText: 'Apfel', textSource: 'manual' })
  })

  it('keeps an empty text unlabeled', () => {
    expect(resolveLabel('   ', 'Wasser')).toEqual({ targetText: '' })
    expect(resolveLabel('')).toEqual({ targetText: '' })
  })

  it('treats an empty prediction like a prediction that was corrected', () => {
    expect(resolveLabel('Apfel', '')).toEqual({ targetText: 'Apfel', textSource: 'corrected' })
  })
})

describe('REQ-REC-008 isUnlabeled', () => {
  it('is only true for free recordings without text', () => {
    expect(isUnlabeled({ phraseId: FREE_PHRASE_ID, targetText: '' })).toBe(true)
    expect(isUnlabeled({ phraseId: FREE_PHRASE_ID, targetText: '  ' })).toBe(true)
    expect(isUnlabeled({ phraseId: FREE_PHRASE_ID, targetText: 'Apfel' })).toBe(false)
    expect(isUnlabeled({ phraseId: 'w-wasser', targetText: '' })).toBe(false)
  })
})
