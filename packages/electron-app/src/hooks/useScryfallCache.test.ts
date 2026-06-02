import { describe, it, expect } from 'vitest'
import { cardsToScryfallIdsKey } from './useScryfallCache'
import type { CardEntry } from '@/types'

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
