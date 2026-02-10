import { describe, it, expect } from 'vitest'
import { findCardByName, findCardIndexByName, consolidateDuplicateCards } from './card-utils.js'
import type { DeckCard } from '../types/index.js'

const createDeckCard = (
  name: string,
  quantity: number = 1,
  overrides: Partial<DeckCard> = {}
): DeckCard => ({
  id: `test-${name}-${Math.random()}`,
  card: {
    name,
    setCode: 'test',
    collectorNumber: '1',
  },
  quantity,
  inclusion: 'confirmed',
  ownership: 'owned',
  roles: [],
  isPinned: false,
  addedAt: new Date().toISOString(),
  addedBy: 'user',
  ...overrides,
})

describe('findCardByName', () => {
  it('finds a card by name', () => {
    const cards = [
      createDeckCard('Lightning Bolt'),
      createDeckCard('Counterspell'),
      createDeckCard('Path to Exile'),
    ]
    const result = findCardByName(cards, 'Counterspell')
    expect(result?.card.name).toBe('Counterspell')
  })

  it('is case-insensitive', () => {
    const cards = [createDeckCard('Lightning Bolt')]
    expect(findCardByName(cards, 'lightning bolt')?.card.name).toBe('Lightning Bolt')
    expect(findCardByName(cards, 'LIGHTNING BOLT')?.card.name).toBe('Lightning Bolt')
  })

  it('returns undefined when not found', () => {
    const cards = [createDeckCard('Lightning Bolt')]
    expect(findCardByName(cards, 'Counterspell')).toBeUndefined()
  })

  it('handles empty list', () => {
    expect(findCardByName([], 'Lightning Bolt')).toBeUndefined()
  })
})

describe('findCardIndexByName', () => {
  it('finds the index of a card by name', () => {
    const cards = [
      createDeckCard('Lightning Bolt'),
      createDeckCard('Counterspell'),
      createDeckCard('Path to Exile'),
    ]
    expect(findCardIndexByName(cards, 'Counterspell')).toBe(1)
  })

  it('is case-insensitive', () => {
    const cards = [createDeckCard('Lightning Bolt')]
    expect(findCardIndexByName(cards, 'lightning bolt')).toBe(0)
  })

  it('returns -1 when not found', () => {
    const cards = [createDeckCard('Lightning Bolt')]
    expect(findCardIndexByName(cards, 'Counterspell')).toBe(-1)
  })
})

describe('consolidateDuplicateCards', () => {
  it('sums quantities for duplicate cards', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 2),
      createDeckCard('Lightning Bolt', 3),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(5)
  })

  it('unions roles from duplicates', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { roles: ['removal'] }),
      createDeckCard('Lightning Bolt', 1, { roles: ['burn'] }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].roles).toContain('removal')
    expect(result[0].roles).toContain('burn')
  })

  it('deduplicates roles', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { roles: ['removal', 'burn'] }),
      createDeckCard('Lightning Bolt', 1, { roles: ['burn', 'finisher'] }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].roles).toEqual(['removal', 'burn', 'finisher'])
  })

  it('keeps earliest addedAt', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { addedAt: '2024-02-01T00:00:00Z' }),
      createDeckCard('Lightning Bolt', 1, { addedAt: '2024-01-01T00:00:00Z' }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].addedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('preserves isPinned if any entry is pinned', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { isPinned: false }),
      createDeckCard('Lightning Bolt', 1, { isPinned: true }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].isPinned).toBe(true)
  })

  it('merges notes from duplicates', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { notes: 'First note' }),
      createDeckCard('Lightning Bolt', 1, { notes: 'Second note' }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].notes).toBe('First note\nSecond note')
  })

  it('handles card with notes and card without', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { notes: undefined }),
      createDeckCard('Lightning Bolt', 1, { notes: 'Has notes' }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].notes).toBe('Has notes')
  })

  it('does not merge identical notes', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 1, { notes: 'Same note' }),
      createDeckCard('Lightning Bolt', 1, { notes: 'Same note' }),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result[0].notes).toBe('Same note')
  })

  it('handles cards with no duplicates', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 2),
      createDeckCard('Counterspell', 3),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result).toHaveLength(2)
    expect(result.find(c => c.card.name === 'Lightning Bolt')?.quantity).toBe(2)
    expect(result.find(c => c.card.name === 'Counterspell')?.quantity).toBe(3)
  })

  it('handles empty array', () => {
    expect(consolidateDuplicateCards([])).toEqual([])
  })

  it('does not mutate original cards', () => {
    const original = createDeckCard('Lightning Bolt', 2, { roles: ['removal'] })
    const cards = [original, createDeckCard('Lightning Bolt', 3, { roles: ['burn'] })]
    consolidateDuplicateCards(cards)
    expect(original.quantity).toBe(2)
    expect(original.roles).toEqual(['removal'])
  })

  it('is case-insensitive for card names', () => {
    const cards = [
      createDeckCard('Lightning Bolt', 2),
      createDeckCard('lightning bolt', 3),
    ]
    const result = consolidateDuplicateCards(cards)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(5)
  })
})
