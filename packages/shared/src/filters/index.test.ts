import { describe, it, expect } from 'vitest'
import { applyFilters, countManaPips, getCmcDistribution, enrichCards } from './index.js'
import type { EnrichedDeckCard, CardFilter } from './index.js'
import type { DeckCard, ScryfallCard } from '../types/index.js'

function makeEnriched(overrides: {
  name?: string
  cmc?: number
  colors?: string[]
  typeLine?: string
  manaCost?: string
  roles?: string[]
  ownership?: string
  quantity?: number
} = {}): EnrichedDeckCard {
  return {
    deckCard: {
      id: 'test',
      card: { name: overrides.name || 'Test Card', setCode: 'test', collectorNumber: '1' },
      quantity: overrides.quantity ?? 1,
      inclusion: 'confirmed',
      ownership: (overrides.ownership as any) || 'owned',
      roles: overrides.roles || [],
      typeLine: overrides.typeLine || 'Creature — Human',
      isPinned: false,
      addedAt: '2024-01-01T00:00:00.000Z',
      source: 'user',
    },
    scryfallCard: {
      id: 'scryfall-test',
      name: overrides.name || 'Test Card',
      cmc: overrides.cmc ?? 3,
      type_line: overrides.typeLine || 'Creature — Human',
      color_identity: overrides.colors || ['U'],
      colors: overrides.colors || ['U'],
      set: 'test',
      collector_number: '1',
      rarity: 'rare',
      mana_cost: overrides.manaCost || '{2}{U}',
      legalities: {},
    } as ScryfallCard,
  }
}

describe('applyFilters', () => {
  const cards = [
    makeEnriched({ name: 'Bolt', cmc: 1, colors: ['R'], typeLine: 'Instant', roles: ['removal'] }),
    makeEnriched({ name: 'Counterspell', cmc: 2, colors: ['U'], typeLine: 'Instant', roles: ['protection'] }),
    makeEnriched({ name: 'Cultivate', cmc: 3, colors: ['G'], typeLine: 'Sorcery', roles: ['ramp'] }),
    makeEnriched({ name: 'Command Tower', cmc: 0, colors: [], typeLine: 'Land' }),
  ]

  it('returns all cards when no filters', () => {
    expect(applyFilters(cards, [])).toHaveLength(4)
  })

  it('filters by CMC include', () => {
    const filter: CardFilter = { type: 'cmc', mode: 'include', values: [1] }
    const result = applyFilters(cards, [filter])
    expect(result).toHaveLength(1)
    expect(result[0].deckCard.card.name).toBe('Bolt')
  })

  it('filters by CMC exclude', () => {
    const filter: CardFilter = { type: 'cmc', mode: 'exclude', values: [0] }
    const result = applyFilters(cards, [filter])
    expect(result).toHaveLength(3)
  })

  it('filters by color include', () => {
    const filter: CardFilter = { type: 'color', mode: 'include', values: ['R'] }
    const result = applyFilters(cards, [filter])
    expect(result).toHaveLength(1)
    expect(result[0].deckCard.card.name).toBe('Bolt')
  })

  it('treats colorless as C', () => {
    const filter: CardFilter = { type: 'color', mode: 'include', values: ['C'] }
    const result = applyFilters(cards, [filter])
    expect(result).toHaveLength(1)
    expect(result[0].deckCard.card.name).toBe('Command Tower')
  })

  it('filters by card type', () => {
    const filter: CardFilter = { type: 'card-type', mode: 'include', values: ['Instant'] }
    const result = applyFilters(cards, [filter])
    expect(result).toHaveLength(2)
  })

  it('filters by role', () => {
    const filter: CardFilter = { type: 'role', mode: 'include', values: ['ramp'] }
    const result = applyFilters(cards, [filter])
    expect(result).toHaveLength(1)
    expect(result[0].deckCard.card.name).toBe('Cultivate')
  })

  it('filters by ownership', () => {
    const ownedCards = [
      makeEnriched({ name: 'A', ownership: 'owned' }),
      makeEnriched({ name: 'B', ownership: 'need_to_buy' }),
    ]
    const filter: CardFilter = { type: 'ownership', mode: 'include', values: ['owned'] }
    const result = applyFilters(ownedCards, [filter])
    expect(result).toHaveLength(1)
    expect(result[0].deckCard.card.name).toBe('A')
  })

  it('applies multiple filters with AND logic', () => {
    const filters: CardFilter[] = [
      { type: 'cmc', mode: 'include', values: [1, 2] },
      { type: 'color', mode: 'include', values: ['U'] },
    ]
    const result = applyFilters(cards, filters)
    expect(result).toHaveLength(1)
    expect(result[0].deckCard.card.name).toBe('Counterspell')
  })
})

describe('countManaPips', () => {
  it('counts pips from mana costs', () => {
    const cards = [
      makeEnriched({ manaCost: '{1}{U}{U}', quantity: 1, typeLine: 'Instant' }),
      makeEnriched({ manaCost: '{R}', quantity: 2, typeLine: 'Instant' }),
    ]
    const pips = countManaPips(cards)
    expect(pips.U).toBe(2)
    expect(pips.R).toBe(2)
  })

  it('excludes lands', () => {
    const cards = [
      makeEnriched({ manaCost: '', typeLine: 'Land', colors: [] }),
    ]
    const pips = countManaPips(cards)
    expect(pips.W + pips.U + pips.B + pips.R + pips.G + pips.C).toBe(0)
  })

  it('counts generic mana as C', () => {
    const cards = [makeEnriched({ manaCost: '{3}{U}', typeLine: 'Creature' })]
    const pips = countManaPips(cards)
    expect(pips.C).toBe(3)
    expect(pips.U).toBe(1)
  })

  it('multiplies by quantity', () => {
    const cards = [makeEnriched({ manaCost: '{R}', quantity: 4, typeLine: 'Instant' })]
    const pips = countManaPips(cards)
    expect(pips.R).toBe(4)
  })
})

describe('getCmcDistribution', () => {
  it('buckets cards by CMC', () => {
    const cards = [
      makeEnriched({ cmc: 0, typeLine: 'Artifact' }),
      makeEnriched({ cmc: 1, typeLine: 'Creature' }),
      makeEnriched({ cmc: 3, typeLine: 'Creature' }),
    ]
    const dist = getCmcDistribution(cards)
    expect(dist[0]).toBe(1)
    expect(dist[1]).toBe(1)
    expect(dist[3]).toBe(1)
    expect(dist[2]).toBe(0)
  })

  it('groups 7+ into bucket 7', () => {
    const cards = [
      makeEnriched({ cmc: 9, typeLine: 'Creature' }),
      makeEnriched({ cmc: 12, typeLine: 'Creature' }),
    ]
    const dist = getCmcDistribution(cards)
    expect(dist[7]).toBe(2)
  })

  it('excludes lands', () => {
    const cards = [makeEnriched({ cmc: 0, typeLine: 'Land' })]
    const dist = getCmcDistribution(cards)
    expect(dist[0]).toBe(0)
  })

  it('counts quantity', () => {
    const cards = [makeEnriched({ cmc: 2, quantity: 4, typeLine: 'Instant' })]
    const dist = getCmcDistribution(cards)
    expect(dist[2]).toBe(4)
  })
})

describe('enrichCards', () => {
  it('pairs deck cards with cached Scryfall data', () => {
    const deckCard: DeckCard = {
      id: 'test', card: { scryfallId: 'sf-1', name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
      quantity: 1, inclusion: 'confirmed', ownership: 'owned', roles: [],
      isPinned: false, addedAt: '', source: 'user',
    }
    const cache = new Map<string, ScryfallCard>()
    cache.set('sf-1', { id: 'sf-1', name: 'Sol Ring' } as ScryfallCard)

    const result = enrichCards([deckCard], cache)
    expect(result).toHaveLength(1)
    expect(result[0].scryfallCard?.name).toBe('Sol Ring')
  })

  it('leaves scryfallCard undefined when not in cache', () => {
    const deckCard: DeckCard = {
      id: 'test', card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
      quantity: 1, inclusion: 'confirmed', ownership: 'owned', roles: [],
      isPinned: false, addedAt: '', source: 'user',
    }
    const result = enrichCards([deckCard], new Map())
    expect(result[0].scryfallCard).toBeUndefined()
  })
})
