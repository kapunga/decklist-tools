import { describe, it, expect } from 'vitest'
import { parseManaSymbol, parseManaCost, tallyManaCost, emptyManaCostTally } from './mana-symbols.js'

describe('parseManaSymbol', () => {
  it('classifies each symbol kind', () => {
    expect(parseManaSymbol('G')).toEqual({ kind: 'colored', color: 'G' })
    expect(parseManaSymbol('C')).toEqual({ kind: 'colorless' })
    expect(parseManaSymbol('12')).toEqual({ kind: 'generic', amount: 12 })
    expect(parseManaSymbol('W/U')).toEqual({ kind: 'hybrid', options: ['W', 'U'] })
    expect(parseManaSymbol('C/W')).toEqual({ kind: 'hybrid', options: ['C', 'W'] })
    expect(parseManaSymbol('W/U/P')).toEqual({ kind: 'hybrid', options: ['W', 'U'] })
    expect(parseManaSymbol('2/W')).toEqual({ kind: 'twobrid', color: 'W' })
    expect(parseManaSymbol('G/P')).toEqual({ kind: 'phyrexian', color: 'G' })
    expect(parseManaSymbol('X')).toEqual({ kind: 'variable' })
    expect(parseManaSymbol('S')).toEqual({ kind: 'snow' })
    expect(parseManaSymbol('HW')).toEqual({ kind: 'other', text: 'HW' })
  })
})

describe('parseManaCost', () => {
  it('splits a cost into symbols', () => {
    expect(parseManaCost('{3}{G}{G}')).toEqual([
      { kind: 'generic', amount: 3 },
      { kind: 'colored', color: 'G' },
      { kind: 'colored', color: 'G' },
    ])
  })

  it('reads both halves of a split cost', () => {
    expect(parseManaCost('{1}{R} // {1}{U}')).toHaveLength(4)
  })

  it('returns no symbols for an empty cost', () => {
    expect(parseManaCost('')).toEqual([])
  })
})

describe('tallyManaCost', () => {
  const tally = (cost: string) => tallyManaCost(parseManaCost(cost))

  it('keeps generic mana out of the colorless pips', () => {
    expect(tally('{3}{G}')).toEqual({ ...emptyManaCostTally, pips: { ...emptyManaCostTally.pips, G: 1 }, generic: 3 })
  })

  it('counts real {C} symbols as colorless', () => {
    expect(tally('{C}{C}').pips.C).toBe(2)
    expect(tally('{C}{C}').generic).toBe(0)
  })

  it('counts a hybrid symbol once toward each of its options', () => {
    const result = tally('{W/U}{W/U}')
    expect(result.pips.W).toBe(2)
    expect(result.pips.U).toBe(2)
  })

  it('counts a twobrid symbol as one pip of its colour and no generic', () => {
    expect(tally('{2/W}')).toEqual({ ...emptyManaCostTally, pips: { ...emptyManaCostTally.pips, W: 1 } })
  })

  it('counts a Phyrexian symbol as one pip of its colour', () => {
    expect(tally('{1}{G/P}').pips.G).toBe(1)
  })

  it('ignores X, snow and other symbols', () => {
    expect(tally('{X}{S}{HW}')).toEqual(emptyManaCostTally)
  })
})
