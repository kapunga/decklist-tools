import { describe, it, expect } from 'vitest'
import { migrateLegacyPulledCards, migrateDeckNote } from './index.js'
import type { Deck, DeckCard } from './index.js'

function makeDeckCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: 'test-card',
    card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
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

function makeDeck(cards: DeckCard[] = [], alternates: DeckCard[] = [], sideboard: DeckCard[] = []): Deck {
  return {
    id: 'test-deck',
    name: 'Test',
    format: {
      type: 'commander',
      deckSize: 100,
      sideboardSize: 0,
      cardLimit: 1,
      unlimitedCards: [],
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cards,
    alternates,
    sideboard,
    commanders: [],
    customRoles: [],
    notes: [],
  }
}

describe('migrateLegacyPulledCards', () => {
  it('returns false when no legacy cards exist', () => {
    const deck = makeDeck([makeDeckCard()])
    expect(migrateLegacyPulledCards(deck)).toBe(false)
  })

  it('migrates ownership from "pulled" to "owned"', () => {
    const card = makeDeckCard({ ownership: 'pulled' as any })
    const deck = makeDeck([card])
    expect(migrateLegacyPulledCards(deck)).toBe(true)
    expect(deck.cards[0].ownership).toBe('owned')
  })

  it('creates pulledPrintings entry from current printing', () => {
    const card = makeDeckCard({
      ownership: 'pulled' as any,
      card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
      quantity: 2,
    })
    const deck = makeDeck([card])
    migrateLegacyPulledCards(deck)
    expect(deck.cards[0].pulledPrintings).toHaveLength(1)
    expect(deck.cards[0].pulledPrintings![0]).toEqual({
      setCode: 'c21',
      collectorNumber: '263',
      quantity: 2,
    })
  })

  it('does not duplicate existing pulledPrintings entry', () => {
    const card = makeDeckCard({
      ownership: 'pulled' as any,
      card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
      pulledPrintings: [{ setCode: 'c21', collectorNumber: '263', quantity: 1 }],
    })
    const deck = makeDeck([card])
    migrateLegacyPulledCards(deck)
    expect(deck.cards[0].pulledPrintings).toHaveLength(1)
  })

  it('migrates cards in alternates and sideboard', () => {
    const altCard = makeDeckCard({ id: 'alt', ownership: 'pulled' as any })
    const sbCard = makeDeckCard({ id: 'sb', ownership: 'pulled' as any })
    const deck = makeDeck([], [altCard], [sbCard])
    expect(migrateLegacyPulledCards(deck)).toBe(true)
    expect(deck.alternates[0].ownership).toBe('owned')
    expect(deck.sideboard[0].ownership).toBe('owned')
  })

  it('leaves non-pulled cards unchanged', () => {
    const ownedCard = makeDeckCard({ ownership: 'owned' })
    const unknownCard = makeDeckCard({ id: 'u', ownership: 'unknown' })
    const pulledCard = makeDeckCard({ id: 'p', ownership: 'pulled' as any })
    const deck = makeDeck([ownedCard, unknownCard, pulledCard])
    migrateLegacyPulledCards(deck)
    expect(deck.cards[0].ownership).toBe('owned')
    expect(deck.cards[1].ownership).toBe('unknown')
    expect(deck.cards[2].ownership).toBe('owned')
  })
})

describe('migrateDeckNote', () => {
  it('fills in defaults for missing fields', () => {
    const note = migrateDeckNote({
      id: 'note-1',
      title: 'Test Note',
      content: 'Some content',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
    expect(note.noteType).toBe('general')
    expect(note.cardRefs).toEqual([])
  })

  it('preserves existing fields', () => {
    const note = migrateDeckNote({
      id: 'note-1',
      title: 'Combo Note',
      content: 'Combo description',
      noteType: 'combo',
      cardRefs: [{ cardName: 'Sol Ring', ordinal: 1 }],
      roleId: 'ramp',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
    expect(note.noteType).toBe('combo')
    expect(note.cardRefs).toHaveLength(1)
    expect(note.roleId).toBe('ramp')
  })
})
