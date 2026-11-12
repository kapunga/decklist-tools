import { describe, it, expect } from 'vitest'
import { applyFilters, countManaPips, tallyManaCosts, getCmcDistribution, enrichCards } from './index.js'
import type { EnrichedDeckCard, CardFilter } from './index.js'
import type { CardEntry, ScryfallCard } from '../types/index.js'

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
      ownership: (overrides.ownership as any) || 'owned',
      roles: overrides.roles || [],
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

  it('a card with unknown mana value (no Scryfall data) is not treated as 0 by a cmc filter', () => {
    const unknown: EnrichedDeckCard = { ...makeEnriched({ name: 'Unknown' }), scryfallCard: undefined }
    expect(applyFilters([unknown], [{ type: 'cmc', mode: 'include', values: [0] }])).toHaveLength(0)
    expect(applyFilters([unknown], [{ type: 'cmc', mode: 'exclude', values: [0] }])).toHaveLength(1)
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

  it('does not count generic mana as colorless', () => {
    const cards = [makeEnriched({ manaCost: '{3}{G}', typeLine: 'Creature' })]
    const pips = countManaPips(cards)
    expect(pips.C).toBe(0)
    expect(pips.G).toBe(1)
  })

  it('counts real {C} symbols as colorless', () => {
    const cards = [makeEnriched({ manaCost: '{C}{C}', quantity: 2, typeLine: 'Artifact' })]
    expect(countManaPips(cards).C).toBe(4)
  })

  it('counts hybrid toward each option, twobrid and Phyrexian toward their colour, and ignores X', () => {
    const cards = [makeEnriched({ manaCost: '{X}{W/U}{2/B}{G/P}', typeLine: 'Sorcery' })]
    expect(countManaPips(cards)).toEqual({ W: 1, U: 1, B: 1, R: 0, G: 1, C: 0 })
  })

  it('skips cards without Scryfall data instead of counting them as zero-cost', () => {
    const unresolved: EnrichedDeckCard = { ...makeEnriched({ manaCost: '{G}' }), scryfallCard: undefined }
    expect(countManaPips([unresolved])).toEqual({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 })
  })
})

describe('tallyManaCosts', () => {
  it('reports generic mana separately from pips, times quantity', () => {
    const cards = [
      makeEnriched({ manaCost: '{3}{G}', quantity: 2, typeLine: 'Creature' }),
      makeEnriched({ manaCost: '{2}', typeLine: 'Artifact' }),
      makeEnriched({ manaCost: '{5}', typeLine: 'Land' }),
    ]
    const tally = tallyManaCosts(cards)
    expect(tally.generic).toBe(8)
    expect(tally.pips.G).toBe(2)
    expect(tally.pips.C).toBe(0)
  })

  it('counts the front-face cost of a transform card', () => {
    const base = makeEnriched({ typeLine: 'Legendary Creature — Human Assassin // Legendary Creature — Werewolf Beast', quantity: 2 })
    const transform: EnrichedDeckCard = {
      ...base,
      scryfallCard: {
        ...base.scryfallCard!,
        layout: 'transform',
        mana_cost: undefined,
        card_faces: [
          { name: 'Vincent Valentine', mana_cost: '{2}{B}{B}', type_line: 'Legendary Creature — Human Assassin' },
          { name: 'Galian Beast', mana_cost: '', type_line: 'Legendary Creature — Werewolf Beast' },
        ],
      },
    }
    const pips = countManaPips([transform])
    expect(pips.B).toBe(4)
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

describe('double-faced and uncached classification', () => {
  it('counts a transform card with an artifact front in the curve (Treasure Map)', () => {
    const dist = getCmcDistribution([makeEnriched({ cmc: 2, typeLine: 'Artifact // Land' })])
    expect(dist[2]).toBe(1)
  })

  it('excludes a land-front transform card from the curve (Balamb Garden)', () => {
    const dist = getCmcDistribution([makeEnriched({ cmc: 0, typeLine: 'Land — Town // Legendary Artifact — Vehicle' })])
    expect(dist[0]).toBe(0)
  })

  it('excludes a stored Land entry from the curve even when uncached', () => {
    const card = makeEnriched({ cmc: 0 })
    const uncached: EnrichedDeckCard = { deckCard: { ...card.deckCard, primaryType: 'Land' } }
    expect(getCmcDistribution([uncached])[0]).toBe(0)
  })

  it('does not count an uncached nonland card at mana value 0', () => {
    const card = makeEnriched({ cmc: 0 })
    const uncached: EnrichedDeckCard = { deckCard: { ...card.deckCard, primaryType: 'Creature' } }
    expect(Object.values(getCmcDistribution([uncached])).every(n => n === 0)).toBe(true)
  })

  it('classifies a noncreature-front card by its front face for the card-type filter', () => {
    const esper = makeEnriched({ name: 'Esper Origins', typeLine: 'Sorcery // Enchantment Creature — Saga Human' })
    expect(applyFilters([esper], [{ type: 'card-type', mode: 'include', values: ['Creature'] }])).toHaveLength(0)
    expect(applyFilters([esper], [{ type: 'card-type', mode: 'include', values: ['Sorcery'] }])).toHaveLength(1)
  })

  it('uses the stored primaryType for the card-type filter when uncached', () => {
    const card = makeEnriched({ name: 'Adewale' })
    const uncached: EnrichedDeckCard = { deckCard: { ...card.deckCard, primaryType: 'Creature' } }
    expect(applyFilters([uncached], [{ type: 'card-type', mode: 'include', values: ['Creature'] }])).toHaveLength(1)
  })
})

describe('enrichCards', () => {
  it('pairs deck cards with cached Scryfall data', () => {
    const deckCard: CardEntry = {
      id: 'test', card: { scryfallId: 'sf-1', name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
      quantity: 1, ownership: 'owned', roles: [],
      addedAt: '', source: 'user',
    }
    const cache = new Map<string, ScryfallCard>()
    cache.set('sf-1', { id: 'sf-1', name: 'Sol Ring' } as ScryfallCard)

    const result = enrichCards([deckCard], cache)
    expect(result).toHaveLength(1)
    expect(result[0].scryfallCard?.name).toBe('Sol Ring')
  })

  it('leaves scryfallCard undefined when not in cache', () => {
    const deckCard: CardEntry = {
      id: 'test', card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
      quantity: 1, ownership: 'owned', roles: [],
      addedAt: '', source: 'user',
    }
    const result = enrichCards([deckCard], new Map())
    expect(result[0].scryfallCard).toBeUndefined()
  })
})
