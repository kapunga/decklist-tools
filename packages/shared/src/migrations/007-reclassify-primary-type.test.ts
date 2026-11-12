import { describe, it, expect } from 'vitest'
import { migrateReclassifyPrimaryType } from './007-reclassify-primary-type.js'
import type { Deck, CardSet, ScryfallCard } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

function makeEntry(name: string, scryfallId: string, overrides: Record<string, unknown> = {}): any {
  return {
    id: `test-${name}`,
    card: { name, scryfallId, setCode: 'tst', collectorNumber: '1' },
    quantity: 1,
    ownership: 'unknown',
    roles: [],
    source: 'user',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeDeck(cardSets: Array<{ name: string; entries: any[] }>): Deck {
  return {
    id: 'deck-1',
    name: 'Test',
    format: { type: 'kitchen_table', deckSize: 60, sideboardSize: 15, cardLimit: 4 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cardSets,
    commanders: [],
    customRoles: [],
    notes: [],
  } as any
}

function entriesOf(deck: Deck, name: string) {
  return (deck as unknown as { cardSets: CardSet[] }).cardSets.find(s => s.name === name)?.entries ?? []
}

function makeCard(typeLine: string): ScryfallCard {
  return { type_line: typeLine } as ScryfallCard
}

describe('migrateReclassifyPrimaryType', () => {
  it('reclassifies stale whole-type-line values by the front face', () => {
    const deck = makeDeck([
      {
        name: CARD_SET.MAINBOARD,
        entries: [
          makeEntry('Esper Origins', 'esper', { primaryType: 'Creature' }),
          makeEntry('Balamb Garden', 'balamb', { primaryType: 'Artifact' }),
        ],
      },
    ])
    const cards: Record<string, string> = {
      esper: 'Sorcery // Enchantment Creature — Saga Human',
      balamb: 'Land — Town // Legendary Artifact — Vehicle',
    }
    migrateReclassifyPrimaryType.migrate(deck, { lookupScryfallCard: id => makeCard(cards[id]) })
    const [esper, balamb] = entriesOf(deck, CARD_SET.MAINBOARD)
    expect(esper.primaryType).toBe('Sorcery')
    expect(balamb.primaryType).toBe('Land')
  })

  it('keeps the stored value when the card is not cached', () => {
    const deck = makeDeck([
      { name: CARD_SET.SIDEBOARD, entries: [makeEntry('Adewale', 'adewale', { primaryType: 'Creature' })] },
    ])
    migrateReclassifyPrimaryType.migrate(deck, { lookupScryfallCard: () => null })
    expect(entriesOf(deck, CARD_SET.SIDEBOARD)[0].primaryType).toBe('Creature')
  })
})
