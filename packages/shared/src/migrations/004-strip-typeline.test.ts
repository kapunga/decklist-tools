import { describe, it, expect } from 'vitest'
import { migrateStripTypeLine } from './004-strip-typeline.js'
import type { Deck, CardSet } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

function makeEntry(name: string, overrides: Record<string, unknown> = {}): any {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'tst', collectorNumber: '1' },
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

const ctx = { lookupScryfallCard: () => null }

function getSet(deck: Deck, name: string): CardSet | undefined {
  return (deck as unknown as { cardSets: CardSet[] }).cardSets.find(s => s.name === name)
}

describe('migrateStripTypeLine', () => {
  it('removes typeLine from every entry', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { typeLine: 'Artifact' })] },
    ])
    migrateStripTypeLine.migrate(deck, ctx)
    const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0] as unknown as Record<string, unknown>
    expect(entry.typeLine).toBeUndefined()
  })

  it('strips typeLine across all card sets', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { typeLine: 'Artifact' })] },
      { name: CARD_SET.SIDEBOARD, entries: [makeEntry('Pyroblast', { typeLine: 'Instant' })] },
      { name: CARD_SET.ALTERNATES, entries: [makeEntry('Mana Vault', { typeLine: 'Artifact' })] },
      { name: CARD_SET.CUT, entries: [makeEntry('Grave Pact', { typeLine: 'Enchantment' })] },
    ])
    migrateStripTypeLine.migrate(deck, ctx)
    for (const setName of [CARD_SET.MAINBOARD, CARD_SET.SIDEBOARD, CARD_SET.ALTERNATES, CARD_SET.CUT]) {
      const entry = getSet(deck, setName)?.entries[0] as unknown as Record<string, unknown>
      expect(entry.typeLine).toBeUndefined()
    }
  })

  it('preserves all other fields', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', {
        typeLine: 'Artifact',
        quantity: 4,
        ownership: 'owned',
        roles: ['ramp'],
        source: 'import',
        notes: 'classic ramp',
      })] },
    ])
    migrateStripTypeLine.migrate(deck, ctx)
    const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0]
    expect(entry?.quantity).toBe(4)
    expect(entry?.ownership).toBe('owned')
    expect(entry?.roles).toEqual(['ramp'])
    expect(entry?.source).toBe('import')
    expect(entry?.notes).toBe('classic ramp')
  })

  it('is a no-op on entries that have no typeLine', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] },
    ])
    const before = JSON.parse(JSON.stringify(deck))
    migrateStripTypeLine.migrate(deck, ctx)
    expect(deck).toEqual(before)
  })

  it('is idempotent — running twice produces the same result', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { typeLine: 'Artifact' })] },
    ])
    migrateStripTypeLine.migrate(deck, ctx)
    const afterFirst = JSON.parse(JSON.stringify(deck))
    migrateStripTypeLine.migrate(deck, ctx)
    expect(deck).toEqual(afterFirst)
  })
})
