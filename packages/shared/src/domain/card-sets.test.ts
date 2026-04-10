import { describe, it, expect } from 'vitest'
import {
  getCardSet,
  getCardSetEntries,
  getAllEntries,
  withCardSet,
  mapCardSet,
  mapAllCardSets,
} from './card-sets.js'
import type { CardEntry, CardSet } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

function makeEntry(name: string, overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1' },
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSets(): CardSet[] {
  return [
    { name: CARD_SET.MAINBOARD, entries: [makeEntry('Lightning Bolt'), makeEntry('Counterspell')] },
    { name: CARD_SET.SIDEBOARD, entries: [makeEntry('Pyroblast')] },
    { name: CARD_SET.ALTERNATES, entries: [] },
  ]
}

describe('getCardSet', () => {
  it('returns the named set', () => {
    const sets = makeSets()
    expect(getCardSet(sets, CARD_SET.MAINBOARD)?.entries).toHaveLength(2)
  })

  it('returns undefined for absent sets', () => {
    expect(getCardSet(makeSets(), 'nonexistent')).toBeUndefined()
  })
})

describe('getCardSetEntries', () => {
  it('returns entries for present sets', () => {
    const entries = getCardSetEntries(makeSets(), CARD_SET.MAINBOARD)
    expect(entries.map(e => e.card.name)).toEqual(['Lightning Bolt', 'Counterspell'])
  })

  it('returns empty array for absent sets', () => {
    expect(getCardSetEntries(makeSets(), 'nonexistent')).toEqual([])
  })

  it('returns empty array for empty sets', () => {
    expect(getCardSetEntries(makeSets(), CARD_SET.ALTERNATES)).toEqual([])
  })
})

describe('getAllEntries', () => {
  it('flattens entries across all sets', () => {
    const entries = getAllEntries(makeSets())
    expect(entries.map(e => e.card.name)).toEqual(['Lightning Bolt', 'Counterspell', 'Pyroblast'])
  })

  it('returns empty array for empty input', () => {
    expect(getAllEntries([])).toEqual([])
  })
})

describe('withCardSet', () => {
  it('replaces entries in an existing set', () => {
    const sets = makeSets()
    const result = withCardSet(sets, CARD_SET.MAINBOARD, [makeEntry('New Card')])
    expect(getCardSetEntries(result, CARD_SET.MAINBOARD).map(e => e.card.name)).toEqual(['New Card'])
  })

  it('preserves other sets when replacing one', () => {
    const sets = makeSets()
    const result = withCardSet(sets, CARD_SET.MAINBOARD, [])
    expect(getCardSetEntries(result, CARD_SET.SIDEBOARD)).toHaveLength(1)
    expect(result).toHaveLength(3)
  })

  it('creates a new set if absent', () => {
    const sets = makeSets()
    const result = withCardSet(sets, 'custom', [makeEntry('Custom Card')])
    expect(result).toHaveLength(4)
    expect(getCardSetEntries(result, 'custom').map(e => e.card.name)).toEqual(['Custom Card'])
  })

  it('does not mutate the input', () => {
    const sets = makeSets()
    withCardSet(sets, CARD_SET.MAINBOARD, [])
    expect(getCardSetEntries(sets, CARD_SET.MAINBOARD)).toHaveLength(2)
  })
})

describe('mapCardSet', () => {
  it('maps entries in the named set', () => {
    const sets = makeSets()
    const result = mapCardSet(sets, CARD_SET.MAINBOARD, e => ({ ...e, notes: 'mapped' }))
    expect(getCardSetEntries(result, CARD_SET.MAINBOARD).every(e => e.notes === 'mapped')).toBe(true)
  })

  it('leaves other sets unchanged', () => {
    const sets = makeSets()
    const result = mapCardSet(sets, CARD_SET.MAINBOARD, e => ({ ...e, notes: 'mapped' }))
    expect(getCardSetEntries(result, CARD_SET.SIDEBOARD)[0].notes).toBeUndefined()
  })

  it('is a no-op when set is absent', () => {
    const sets = makeSets()
    const result = mapCardSet(sets, 'nonexistent', e => ({ ...e, notes: 'mapped' }))
    expect(result).toBe(sets)
  })
})

describe('mapAllCardSets', () => {
  it('maps entries across all sets', () => {
    const sets = makeSets()
    const result = mapAllCardSets(sets, e => ({ ...e, notes: 'all' }))
    expect(getAllEntries(result).every(e => e.notes === 'all')).toBe(true)
  })

  it('preserves set names and structure', () => {
    const sets = makeSets()
    const result = mapAllCardSets(sets, e => e)
    expect(result.map(s => s.name)).toEqual([CARD_SET.MAINBOARD, CARD_SET.SIDEBOARD, CARD_SET.ALTERNATES])
    expect(result.map(s => s.entries.length)).toEqual([2, 1, 0])
  })

  it('does not mutate the input', () => {
    const sets = makeSets()
    mapAllCardSets(sets, e => ({ ...e, notes: 'mutated' }))
    expect(sets[0].entries[0].notes).toBeUndefined()
  })
})
