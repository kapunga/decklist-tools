import { describe, it, expect } from 'vitest'
import { cardsToScryfallIdsKey, sameCards } from './useScryfallCache'
import type { CardEntry, ScryfallCard } from '@/types'

// Minimal CardEntry stub — only `card.scryfallId` matters for the signature.
function entry(scryfallId?: string): CardEntry {
  return { card: { scryfallId } } as unknown as CardEntry
}

describe('cardsToScryfallIdsKey', () => {
  it('is the regression guard: equal ids in a fresh array instance yield an equal string', () => {
    // This is the property that prevents the infinite render loop (React #185).
    // Callers pass a new array every render; the effect keys on this value, so
    // a new-but-equivalent array must NOT produce a new key.
    const render1 = [entry('a'), entry('b')]
    const render2 = [entry('a'), entry('b')] // different array, same ids

    expect(render1).not.toBe(render2) // different references...
    expect(cardsToScryfallIdsKey(render1)).toBe(cardsToScryfallIdsKey(render2)) // ...same key
  })

  it('returns an empty string for no cards', () => {
    expect(cardsToScryfallIdsKey([])).toBe('')
  })

  it('changes when the set of ids changes', () => {
    expect(cardsToScryfallIdsKey([entry('a')])).not.toBe(cardsToScryfallIdsKey([entry('a'), entry('b')]))
  })

  it('is order-independent', () => {
    expect(cardsToScryfallIdsKey([entry('a'), entry('b')]))
      .toBe(cardsToScryfallIdsKey([entry('b'), entry('a')]))
  })

  it('de-duplicates repeated ids', () => {
    expect(cardsToScryfallIdsKey([entry('a'), entry('a')])).toBe(cardsToScryfallIdsKey([entry('a')]))
  })

  it('ignores entries without a scryfallId', () => {
    expect(cardsToScryfallIdsKey([entry('a'), entry(undefined)])).toBe(cardsToScryfallIdsKey([entry('a')]))
  })
})

describe('sameCards', () => {
  const sol = { id: 'sol' } as ScryfallCard
  const signet = { id: 'signet' } as ScryfallCard

  it('is true for two maps holding the same card objects', () => {
    expect(sameCards(new Map([['sol', sol]]), new Map([['sol', sol]]))).toBe(true)
  })

  it('is false when a card was added', () => {
    expect(sameCards(new Map([['sol', sol]]), new Map([['sol', sol], ['signet', signet]]))).toBe(false)
  })

  it('is false when the same id holds a different object', () => {
    expect(sameCards(new Map([['sol', sol]]), new Map([['sol', { ...sol }]]))).toBe(false)
  })

  it('is false when one id was swapped for another', () => {
    expect(sameCards(new Map([['sol', sol]]), new Map([['signet', signet]]))).toBe(false)
  })
})
