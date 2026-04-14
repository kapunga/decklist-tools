import { describe, it, expect } from 'vitest'
import { migrateCardEntryCleanup } from './003-card-entry-cleanup.js'
import type { Deck, CardSet } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

// Migrations operate on historical data shapes, so test fixtures are
// loosely typed — mirrors the convention established by 002-card-sets.test.ts.
function makeEntry(name: string, overrides: Record<string, unknown> = {}): any {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'tst', collectorNumber: '1' },
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

describe('migrateCardEntryCleanup', () => {
  describe('backfills', () => {
    it('sets quantity to 1 when missing', () => {
      const deck = makeDeck([{ name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] }])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries[0].quantity).toBe(1)
    })

    it('sets roles to empty array when missing', () => {
      const deck = makeDeck([{ name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] }])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries[0].roles).toEqual([])
    })

    it('sets source to "user" when missing', () => {
      const deck = makeDeck([{ name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] }])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries[0].source).toBe('user')
    })

    it('sets ownership to "unknown" when missing', () => {
      const deck = makeDeck([{ name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] }])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries[0].ownership).toBe('unknown')
    })

    it('preserves existing values when set', () => {
      const deck = makeDeck([{
        name: CARD_SET.MAINBOARD,
        entries: [makeEntry('Sol Ring', {
          quantity: 4,
          roles: ['ramp'],
          source: 'import',
          ownership: 'owned',
        })],
      }])
      migrateCardEntryCleanup.migrate(deck, ctx)
      const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0]
      expect(entry?.quantity).toBe(4)
      expect(entry?.roles).toEqual(['ramp'])
      expect(entry?.source).toBe('import')
      expect(entry?.ownership).toBe('owned')
    })
  })

  describe('inclusion → CardSet conversion', () => {
    it('moves cut entries into a new cut set', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Grave Pact', { inclusion: 'cut' })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries).toHaveLength(0)
      const cut = getSet(deck, CARD_SET.CUT)
      expect(cut?.entries.map(e => e.card.name)).toEqual(['Grave Pact'])
    })

    it('moves considering entries into alternates', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Eldrazi Conscription', { inclusion: 'considering' })] },
        { name: CARD_SET.ALTERNATES, entries: [] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries).toHaveLength(0)
      expect(getSet(deck, CARD_SET.ALTERNATES)?.entries.map(e => e.card.name)).toEqual(['Eldrazi Conscription'])
    })

    it('leaves confirmed entries in place', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { inclusion: 'confirmed' })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries.map(e => e.card.name)).toEqual(['Sol Ring'])
      expect(getSet(deck, CARD_SET.CUT)).toBeUndefined()
    })

    it('leaves entries without an inclusion field in place', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries.map(e => e.card.name)).toEqual(['Sol Ring'])
    })

    it('moves a considering entry already in alternates as a no-op (stays in place)', () => {
      const deck = makeDeck([
        { name: CARD_SET.ALTERNATES, entries: [makeEntry('Rhystic Study', { inclusion: 'considering' })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.ALTERNATES)?.entries.map(e => e.card.name)).toEqual(['Rhystic Study'])
    })

    it('moves a cut entry from sideboard to the cut set', () => {
      const deck = makeDeck([
        { name: CARD_SET.SIDEBOARD, entries: [makeEntry('Pyroblast', { inclusion: 'cut' })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.SIDEBOARD)?.entries).toHaveLength(0)
      expect(getSet(deck, CARD_SET.CUT)?.entries.map(e => e.card.name)).toEqual(['Pyroblast'])
    })

    it('only creates the cut set when there are cuts', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring')] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.CUT)).toBeUndefined()
    })

    it('merges duplicates that end up in the cut set', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Grave Pact', { inclusion: 'cut', quantity: 1 })] },
        { name: CARD_SET.SIDEBOARD, entries: [makeEntry('Grave Pact', { inclusion: 'cut', quantity: 1 })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      const cut = getSet(deck, CARD_SET.CUT)
      expect(cut?.entries).toHaveLength(1)
      expect(cut?.entries[0].quantity).toBe(2)
    })

    it('merges considering duplicates into an existing alternates entry', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { inclusion: 'considering', quantity: 1, roles: ['ramp'] })] },
        { name: CARD_SET.ALTERNATES, entries: [makeEntry('Sol Ring', { quantity: 2, roles: ['engine'] })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      const alternates = getSet(deck, CARD_SET.ALTERNATES)
      expect(alternates?.entries).toHaveLength(1)
      expect(alternates?.entries[0].quantity).toBe(3)
      expect(alternates?.entries[0].roles).toEqual(expect.arrayContaining(['ramp', 'engine']))
    })
  })

  describe('field stripping', () => {
    it('removes the inclusion field from every entry', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { inclusion: 'confirmed' })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0] as unknown as Record<string, unknown>
      expect(entry.inclusion).toBeUndefined()
    })

    it('removes the isPinned field from every entry', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { isPinned: true })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0] as unknown as Record<string, unknown>
      expect(entry.isPinned).toBeUndefined()
    })

    it('drops legacy typeLine (also handled by migration 004)', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', { typeLine: 'Artifact' })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      const entry = getSet(deck, CARD_SET.MAINBOARD)?.entries[0] as unknown as Record<string, unknown>
      expect(entry.typeLine).toBeUndefined()
    })

    it('preserves pulledPrintings and potentialDecks', () => {
      const deck = makeDeck([
        { name: CARD_SET.MAINBOARD, entries: [makeEntry('Sol Ring', {
          pulledPrintings: [{ setCode: 'lea', collectorNumber: '270', quantity: 1 }],
        })] },
      ])
      migrateCardEntryCleanup.migrate(deck, ctx)
      expect(getSet(deck, CARD_SET.MAINBOARD)?.entries[0].pulledPrintings)
        .toEqual([{ setCode: 'lea', collectorNumber: '270', quantity: 1 }])
    })
  })

  it('is idempotent — running twice produces the same result', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [
        makeEntry('Sol Ring', { inclusion: 'confirmed', isPinned: true }),
        makeEntry('Grave Pact', { inclusion: 'cut', notes: 'too slow' }),
      ] },
      { name: CARD_SET.ALTERNATES, entries: [] },
    ])

    migrateCardEntryCleanup.migrate(deck, ctx)
    const afterFirst = JSON.parse(JSON.stringify(deck))

    migrateCardEntryCleanup.migrate(deck, ctx)
    expect(deck).toEqual(afterFirst)
  })

  it('preserves cut notes end-to-end (the design feature of the cut set)', () => {
    const deck = makeDeck([
      { name: CARD_SET.MAINBOARD, entries: [
        makeEntry('Grave Pact', { inclusion: 'cut', notes: "don't own, too expensive" }),
      ] },
    ])
    migrateCardEntryCleanup.migrate(deck, ctx)
    const cutEntry = getSet(deck, CARD_SET.CUT)?.entries[0]
    expect(cutEntry?.notes).toBe("don't own, too expensive")
  })
})
