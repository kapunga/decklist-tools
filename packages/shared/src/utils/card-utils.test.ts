import { describe, it, expect } from 'vitest'
import { findCardByName, findCardIndexByName } from './card-utils.js'
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
  source: 'user',
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
