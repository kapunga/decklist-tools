import { describe, it, expect } from 'vitest'
import type { CardEntry } from '@/types'
import { clampQuantity, sortedByName } from './deckRows'

describe('clampQuantity', () => {
  it('applies the change inside the limit', () => {
    expect(clampQuantity(2, 1, 4)).toBe(3)
    expect(clampQuantity(2, -1, 4)).toBe(1)
  })

  it('stops at the limit', () => {
    expect(clampQuantity(4, 1, 4)).toBe(4)
  })

  it('never goes below one', () => {
    expect(clampQuantity(1, -1, 4)).toBe(1)
    expect(clampQuantity(1, -5, 4)).toBe(1)
  })

  it('caps an unlimited card at 99', () => {
    // Basic lands have a limit of Infinity.
    expect(clampQuantity(98, 1, Infinity)).toBe(99)
    expect(clampQuantity(99, 1, Infinity)).toBe(99)
  })

  it('treats a missing limit as unlimited', () => {
    expect(clampQuantity(10, 1, null)).toBe(11)
    expect(clampQuantity(99, 1, undefined)).toBe(99)
  })
})

describe('sortedByName', () => {
  const named = (name: string): CardEntry => ({ id: name, card: { name } }) as CardEntry

  it('orders entries by card name', () => {
    const sorted = sortedByName([named('Sol Ring'), named('Arcane Signet'), named('Opt')])

    expect(sorted.map(e => e.card.name)).toEqual(['Arcane Signet', 'Opt', 'Sol Ring'])
  })

  it('leaves its input alone', () => {
    // The input is a memoized group; sorting it in place during render mutated the memo.
    const input = Object.freeze([named('Sol Ring'), named('Arcane Signet')])

    expect(() => sortedByName(input)).not.toThrow()
    expect(input.map(e => e.card.name)).toEqual(['Sol Ring', 'Arcane Signet'])
  })

  it('keeps the entry objects themselves', () => {
    const sol = named('Sol Ring')

    expect(sortedByName([sol])[0]).toBe(sol)
  })
})
