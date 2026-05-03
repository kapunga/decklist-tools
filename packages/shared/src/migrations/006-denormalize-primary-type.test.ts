import { describe, it, expect } from 'vitest'
import { migrateDenormalizePrimaryType } from './006-denormalize-primary-type.js'
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
    format: {
      type: 'kitchen_table',
      deckSize: 60,
      sideboardSize: 15,
      cardLimit: 4,
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cardSets,
    commanders: [],
    customRoles: [],
    notes: [],
  } as any
}

function getSet(deck: Deck, name: string): CardSet | undefined {
  return (deck as unknown as { cardSets: CardSet[] }).cardSets.find(s => s.name === name)
}

function makeCard(typeLine: string): ScryfallCard {
  return { type_line: typeLine } as ScryfallCard
}

describe('migrateDenormalizePrimaryType', () => {
  it('backfills primaryType from the cache', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', 'sol-ring-id')] },
    ])
    const ctx = { lookupScryfallCard: (id: string) => id === 'sol-ring-id' ? makeCard('Artifact') : null }
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0]
    expect(entry?.primaryType).toBe('Artifact')
  })

  it('skips entries that already have primaryType', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', 'sol-ring-id', { primaryType: 'Land' })] },
    ])
    // Even if the cache says otherwise, the entry's existing value wins.
    const ctx = { lookupScryfallCard: () => makeCard('Artifact') }
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0]
    expect(entry?.primaryType).toBe('Land')
  })

  it('leaves primaryType undefined when the cache misses', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Unknown Card', 'unknown-id')] },
    ])
    const ctx = { lookupScryfallCard: () => null }
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0]
    expect(entry?.primaryType).toBeUndefined()
  })

  it('handles bimodal type_line correctly', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Bushi Tenderfoot', 'bushi-id')] },
    ])
    const ctx = { lookupScryfallCard: () => makeCard('Creature — Human Soldier // Legendary Creature — Human Samurai') }
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0]
    expect(entry?.primaryType).toBe('Creature')
  })

  it('migrates across all card sets', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', 'a')] },
      { name: CARD_SET.SIDEBOARD, entries: [makeEntry('Pyroblast', 'b')] },
      { name: CARD_SET.ALTERNATES, entries: [makeEntry('Mountain', 'c')] },
    ])
    const cards: Record<string, string> = { a: 'Artifact', b: 'Instant', c: 'Basic Land — Mountain' }
    const ctx = { lookupScryfallCard: (id: string) => cards[id] ? makeCard(cards[id]) : null }
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    expect(getSet(deck, CARD_SET.MAINBOARD)?.entries[0].primaryType).toBe('Artifact')
    expect(getSet(deck, CARD_SET.SIDEBOARD)?.entries[0].primaryType).toBe('Instant')
    expect(getSet(deck, CARD_SET.ALTERNATES)?.entries[0].primaryType).toBe('Land')
  })

  it('is idempotent — running twice produces the same result', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', 'sol-ring-id')] },
    ])
    const ctx = { lookupScryfallCard: () => makeCard('Artifact') }
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    const afterFirst = JSON.parse(JSON.stringify(deck))
    migrateDenormalizePrimaryType.migrate(deck, ctx)
    expect(deck).toEqual(afterFirst)
  })
})
