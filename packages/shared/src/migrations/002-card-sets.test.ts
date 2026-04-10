import { describe, it, expect } from 'vitest'
import { migrateCardSets } from './002-card-sets.js'
import type { Deck, CardSet } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

// Minimal legacy-shape deck factory. We build these as `any` because
// the type surface no longer matches once Phase 3 lands, but migrations
// always operate on historical data shapes.
function makeLegacyCard(name: string, overrides: Record<string, unknown> = {}): any {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'tst', collectorNumber: '1' },
    quantity: 1,
    inclusion: 'confirmed',
    ownership: 'owned',
    roles: [],
    isPinned: false,
    addedAt: '2024-01-01T00:00:00.000Z',
    addedBy: 'user',
    ...overrides,
  }
}

function makeLegacyDeck(overrides: Record<string, unknown> = {}): Deck {
  return {
    id: 'deck-1',
    name: 'Test',
    format: {
      type: 'kitchen_table',
      deckSize: 60,
      sideboardSize: 15,
      cardLimit: 4,
      unlimitedCards: [],
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cards: [],
    sideboard: [],
    alternates: [],
    commanders: [],
    customRoles: [],
    notes: [],
    ...overrides,
  } as any
}

describe('migrateCardSets', () => {
  it('converts cards/sideboard/alternates into cardSets', () => {
    const deck = makeLegacyDeck({
      cards: [makeLegacyCard('Lightning Bolt')],
      sideboard: [makeLegacyCard('Pyroblast')],
      alternates: [makeLegacyCard('Counterspell')],
    })

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })

    const result = deck as unknown as { cardSets: CardSet[] }
    expect(result.cardSets).toHaveLength(3)
    expect(result.cardSets.find(s => s.name === CARD_SET.MAINBOARD)?.entries.map(e => e.card.name)).toEqual(['Lightning Bolt'])
    expect(result.cardSets.find(s => s.name === CARD_SET.SIDEBOARD)?.entries.map(e => e.card.name)).toEqual(['Pyroblast'])
    expect(result.cardSets.find(s => s.name === CARD_SET.ALTERNATES)?.entries.map(e => e.card.name)).toEqual(['Counterspell'])
  })

  it('removes old cards/sideboard/alternates properties', () => {
    const deck = makeLegacyDeck({
      cards: [makeLegacyCard('Lightning Bolt')],
    })

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })

    const result = deck as unknown as Record<string, unknown>
    expect(result.cards).toBeUndefined()
    expect(result.sideboard).toBeUndefined()
    expect(result.alternates).toBeUndefined()
  })

  it('maps addedBy to source', () => {
    const deck = makeLegacyDeck({
      cards: [
        makeLegacyCard('User Card', { addedBy: 'user' }),
        makeLegacyCard('Imported Card', { addedBy: 'import' }),
      ],
    })

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })

    const entries = (deck as unknown as { cardSets: CardSet[] }).cardSets[0].entries
    expect(entries[0].source).toBe('user')
    expect(entries[1].source).toBe('import')
    expect((entries[0] as unknown as Record<string, unknown>).addedBy).toBeUndefined()
  })

  it('preserves all card fields', () => {
    const deck = makeLegacyDeck({
      cards: [makeLegacyCard('Lightning Bolt', {
        quantity: 4,
        inclusion: 'confirmed',
        ownership: 'need_to_buy',
        roles: ['removal'],
        typeLine: 'Instant',
        isPinned: true,
        notes: 'key removal',
        pulledPrintings: [{ setCode: 'lea', collectorNumber: '1', quantity: 2 }],
      })],
    })

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })

    const entry = (deck as unknown as { cardSets: CardSet[] }).cardSets[0].entries[0]
    expect(entry.quantity).toBe(4)
    expect(entry.inclusion).toBe('confirmed')
    expect(entry.ownership).toBe('need_to_buy')
    expect(entry.roles).toEqual(['removal'])
    expect(entry.typeLine).toBe('Instant')
    expect(entry.isPinned).toBe(true)
    expect(entry.notes).toBe('key removal')
    expect(entry.pulledPrintings).toEqual([{ setCode: 'lea', collectorNumber: '1', quantity: 2 }])
  })

  it('handles empty lists', () => {
    const deck = makeLegacyDeck({
      cards: [],
      sideboard: [],
      alternates: [],
    })

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })

    const result = deck as unknown as { cardSets: CardSet[] }
    expect(result.cardSets).toHaveLength(3)
    expect(result.cardSets.every(s => s.entries.length === 0)).toBe(true)
  })

  it('handles missing list properties as empty', () => {
    const deck = makeLegacyDeck()
    delete (deck as any).cards
    delete (deck as any).sideboard
    delete (deck as any).alternates

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })

    const result = deck as unknown as { cardSets: CardSet[] }
    expect(result.cardSets).toHaveLength(3)
    expect(result.cardSets.every(s => s.entries.length === 0)).toBe(true)
  })

  it('is idempotent — running twice does not double-migrate', () => {
    const deck = makeLegacyDeck({
      cards: [makeLegacyCard('Lightning Bolt')],
    })

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })
    const afterFirst = JSON.parse(JSON.stringify(deck))

    migrateCardSets.migrate(deck, { lookupScryfallCard: () => null })
    expect(deck).toEqual(afterFirst)
  })
})
