import { describe, it, expect } from 'vitest'
import {
  getCardListEntries,
  withCardListEntries,
  mapCardListEntries,
  isWellKnownList,
} from './card-lists.js'
import type { CardEntry, CardList } from '../types/index.js'
import { CARD_SET, INTEREST_LIST_ID } from '../types/index.js'

function makeEntry(name: string, overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1' },
    quantity: 1,
    ownership: 'unknown',
    roles: [],
    source: 'user',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeList(overrides: Partial<CardList> = {}): CardList {
  return {
    id: 'test-list',
    name: 'Test',
    version: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    cardSets: [{ name: CARD_SET.MAINBOARD, entries: [makeEntry('Lightning Bolt')] }],
    ...overrides,
  }
}

describe('getCardListEntries', () => {
  it('returns the main set entries', () => {
    const list = makeList()
    expect(getCardListEntries(list).map(e => e.card.name)).toEqual(['Lightning Bolt'])
  })

  it('returns empty array when cardSets is empty', () => {
    const list = makeList({ cardSets: [] })
    expect(getCardListEntries(list)).toEqual([])
  })
})

describe('withCardListEntries', () => {
  it('replaces the main set entries while preserving the set name', () => {
    const list = makeList()
    const result = withCardListEntries(list, [makeEntry('Counterspell')])
    expect(result.cardSets).toHaveLength(1)
    expect(result.cardSets[0].name).toBe(CARD_SET.MAINBOARD)
    expect(result.cardSets[0].entries.map(e => e.card.name)).toEqual(['Counterspell'])
  })

  it('falls back to MAINBOARD when cardSets is empty', () => {
    const list = makeList({ cardSets: [] })
    const result = withCardListEntries(list, [makeEntry('A')])
    expect(result.cardSets[0].name).toBe(CARD_SET.MAINBOARD)
  })

  it('does not mutate the input list', () => {
    const list = makeList()
    withCardListEntries(list, [])
    expect(list.cardSets[0].entries).toHaveLength(1)
  })
})

describe('mapCardListEntries', () => {
  it('maps every entry through fn', () => {
    const list = makeList({
      cardSets: [{
        name: CARD_SET.MAINBOARD,
        entries: [makeEntry('A'), makeEntry('B')],
      }],
    })
    const result = mapCardListEntries(list, e => ({ ...e, notes: 'mapped' }))
    expect(result.cardSets[0].entries.every(e => e.notes === 'mapped')).toBe(true)
  })
})

describe('isWellKnownList', () => {
  it('is true for the well-known interest list id', () => {
    expect(isWellKnownList(makeList({ id: INTEREST_LIST_ID }))).toBe(true)
  })

  it('is false for any other list id', () => {
    expect(isWellKnownList(makeList({ id: 'some-other-uuid' }))).toBe(false)
  })
})
