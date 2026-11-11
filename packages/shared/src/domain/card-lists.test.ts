import { describe, it, expect } from 'vitest'
import {
  getCardListEntries,
  withCardListEntries,
  mapCardListEntries,
  isWellKnownList,
  removeEntryFromList,
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

describe('removeEntryFromList', () => {
  const dup = (id: string, overrides: Partial<CardEntry> = {}) =>
    makeEntry('Together as One', {
      id,
      card: { name: 'Together as One', setCode: 'sos', collectorNumber: '4' },
      ...overrides,
    })
  const listOf = (...entries: CardEntry[]) =>
    makeList({ cardSets: [{ name: CARD_SET.MAINBOARD, entries }] })
  const messageOf = (fn: () => unknown): string => {
    try { fn() } catch (e) { return (e as Error).message }
    return ''
  }

  it('removes exactly the entry with the given id, even when names match', () => {
    const list = listOf(dup('a'), dup('b', { notes: 'keep me' }))
    const { list: next, removed } = removeEntryFromList(list, { entryId: 'b' })
    expect(removed.id).toBe('b')
    expect(getCardListEntries(next).map(e => e.id)).toEqual(['a'])
  })

  it('prefers entryId over cardName when both are given', () => {
    const list = listOf(dup('a'), dup('b'))
    const { removed } = removeEntryFromList(list, { entryId: 'b', cardName: 'Together as One' })
    expect(removed.id).toBe('b')
  })

  it('throws when the entry id is not found', () => {
    expect(() => removeEntryFromList(listOf(dup('a')), { entryId: 'zzz' })).toThrow(/Entry not found/)
  })

  it('removes a uniquely named entry (case-insensitive)', () => {
    const list = listOf(makeEntry('Lightning Bolt'), makeEntry('Counterspell'))
    const { list: next, removed } = removeEntryFromList(list, { cardName: 'lightning bolt' })
    expect(removed.card.name).toBe('Lightning Bolt')
    expect(getCardListEntries(next).map(e => e.card.name)).toEqual(['Counterspell'])
  })

  it('throws when the name is not found', () => {
    expect(() => removeEntryFromList(listOf(dup('a')), { cardName: 'Nope' }))
      .toThrow('Card not found in list: Nope')
  })

  it('refuses an ambiguous name, removes nothing, and lists the candidates', () => {
    const list = listOf(dup('a'), dup('b', { notes: 'n', potentialDecks: ['d1'] }))
    const message = messageOf(() => removeEntryFromList(list, { cardName: 'Together as One' }))
    expect(message).toMatch(/matches 2 entries/)
    expect(message).toContain('id=a (SOS #4)')
    expect(message).toContain('id=b (SOS #4, has notes and potential decks)')
    expect(getCardListEntries(list)).toHaveLength(2)
  })

  it('uses set code and collector number to disambiguate a name', () => {
    const list = listOf(
      dup('a'),
      dup('b', { card: { name: 'Together as One', setCode: 'xyz', collectorNumber: '9' } }),
    )
    const { removed } = removeEntryFromList(list, {
      cardName: 'Together as One', setCode: 'XYZ', collectorNumber: '9',
    })
    expect(removed.id).toBe('b')
  })

  it('still refuses when set and collector number leave several matches', () => {
    const list = listOf(dup('a'), dup('b'))
    expect(() => removeEntryFromList(list, {
      cardName: 'Together as One', setCode: 'sos', collectorNumber: '4',
    })).toThrow(/matches 2 entries/)
  })

  it('requires entryId or cardName', () => {
    expect(() => removeEntryFromList(listOf(dup('a')), {})).toThrow(/entry_id or card_name/)
  })
})
