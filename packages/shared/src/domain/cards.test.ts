import { describe, it, expect } from 'vitest'
import { mergeCardIntoList, addCardToDeck, removeCardFromDeck, moveCard, findCardAcrossLists } from './cards.js'
import type { Deck, DeckCard } from '../types/index.js'
import { DECK_LIST, FORMAT_TYPE, INCLUSION_STATUS, OWNERSHIP_STATUS, ADDED_BY } from '../types/index.js'

function makeDeckCard(name: string, overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1' },
    quantity: 1,
    inclusion: INCLUSION_STATUS.CONFIRMED,
    ownership: OWNERSHIP_STATUS.OWNED,
    roles: [],
    isPinned: false,
    addedAt: '2024-01-01T00:00:00.000Z',
    addedBy: ADDED_BY.USER,
    ...overrides,
  }
}

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'test-deck',
    name: 'Test',
    format: { type: FORMAT_TYPE.COMMANDER, deckSize: 100, sideboardSize: 0, cardLimit: 1, unlimitedCards: [] },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cards: [],
    alternates: [],
    sideboard: [],
    commanders: [],
    customRoles: [],
    notes: [],
    ...overrides,
  }
}

describe('mergeCardIntoList', () => {
  it('appends when card is new', () => {
    const card = makeDeckCard('Sol Ring')
    const { list, merged } = mergeCardIntoList([], card)
    expect(list).toHaveLength(1)
    expect(merged).toBe(false)
  })

  it('merges quantity when card exists', () => {
    const existing = makeDeckCard('Sol Ring', { quantity: 1 })
    const incoming = makeDeckCard('Sol Ring', { quantity: 2 })
    const { list, merged } = mergeCardIntoList([existing], incoming)
    expect(list[0].quantity).toBe(3)
    expect(merged).toBe(true)
  })

  it('unions roles on merge', () => {
    const existing = makeDeckCard('Sol Ring', { roles: ['ramp'] })
    const incoming = makeDeckCard('Sol Ring', { roles: ['ramp', 'engine'] })
    const { list } = mergeCardIntoList([existing], incoming)
    expect(list[0].roles).toEqual(['ramp', 'engine'])
  })

  it('is case-insensitive on name', () => {
    const existing = makeDeckCard('Sol Ring')
    const incoming = makeDeckCard('sol ring', { quantity: 2 })
    const { merged } = mergeCardIntoList([existing], incoming)
    expect(merged).toBe(true)
  })

  it('does not mutate the input list', () => {
    const original = [makeDeckCard('Sol Ring', { quantity: 1 })]
    const incoming = makeDeckCard('Sol Ring', { quantity: 2 })
    mergeCardIntoList(original, incoming)
    expect(original[0].quantity).toBe(1)
  })

  it('merges notes', () => {
    const existing = makeDeckCard('Sol Ring', { notes: 'note A' })
    const incoming = makeDeckCard('Sol Ring', { notes: 'note B' })
    const { list } = mergeCardIntoList([existing], incoming)
    expect(list[0].notes).toBe('note A\nnote B')
  })
})

describe('addCardToDeck', () => {
  it('adds to mainboard', () => {
    const deck = makeDeck()
    const card = makeDeckCard('Sol Ring')
    const result = addCardToDeck(deck, card, DECK_LIST.MAINBOARD)
    expect(result.deck.cards).toHaveLength(1)
    expect(result.meta.merged).toBe(false)
  })

  it('adds to sideboard', () => {
    const deck = makeDeck()
    const card = makeDeckCard('Sol Ring')
    const result = addCardToDeck(deck, card, DECK_LIST.SIDEBOARD)
    expect(result.deck.sideboard).toHaveLength(1)
    expect(result.deck.cards).toHaveLength(0)
  })

  it('adds to alternates', () => {
    const deck = makeDeck()
    const card = makeDeckCard('Sol Ring')
    const result = addCardToDeck(deck, card, DECK_LIST.ALTERNATES)
    expect(result.deck.alternates).toHaveLength(1)
  })

  it('merges with existing card', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring', { quantity: 1 })] })
    const card = makeDeckCard('Sol Ring', { quantity: 2 })
    const result = addCardToDeck(deck, card, DECK_LIST.MAINBOARD)
    expect(result.deck.cards[0].quantity).toBe(3)
    expect(result.meta.merged).toBe(true)
  })

  it('does not mutate the original deck', () => {
    const deck = makeDeck()
    const card = makeDeckCard('Sol Ring')
    addCardToDeck(deck, card, DECK_LIST.MAINBOARD)
    expect(deck.cards).toHaveLength(0)
  })
})

describe('removeCardFromDeck', () => {
  it('removes entirely when no quantity specified', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring', { quantity: 4 })] })
    const result = removeCardFromDeck(deck, 'Sol Ring', DECK_LIST.MAINBOARD)
    expect(result.deck.cards).toHaveLength(0)
    expect(result.meta.remainingQty).toBe(0)
  })

  it('decrements when quantity < current', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring', { quantity: 4 })] })
    const result = removeCardFromDeck(deck, 'Sol Ring', DECK_LIST.MAINBOARD, 2)
    expect(result.deck.cards[0].quantity).toBe(2)
    expect(result.meta.remainingQty).toBe(2)
  })

  it('throws when card not found', () => {
    const deck = makeDeck()
    expect(() => removeCardFromDeck(deck, 'Nope', DECK_LIST.MAINBOARD)).toThrow('Card not found')
  })

  it('does not mutate the original deck', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring')] })
    removeCardFromDeck(deck, 'Sol Ring', DECK_LIST.MAINBOARD)
    expect(deck.cards).toHaveLength(1)
  })
})

describe('moveCard', () => {
  it('moves card between lists', () => {
    const deck = makeDeck({
      cards: [makeDeckCard('Sol Ring')],
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
    })
    const result = moveCard(deck, 'Sol Ring', DECK_LIST.MAINBOARD, DECK_LIST.SIDEBOARD)
    expect(result.deck.cards).toHaveLength(0)
    expect(result.deck.sideboard).toHaveLength(1)
    expect(result.meta.moved).toEqual(['Sol Ring'])
    expect(result.meta.merged).toEqual([])
  })

  it('merges when target has same card', () => {
    const deck = makeDeck({
      cards: [makeDeckCard('Sol Ring', { quantity: 1, roles: ['ramp'] })],
      alternates: [makeDeckCard('Sol Ring', { quantity: 2, roles: ['engine'] })],
    })
    const result = moveCard(deck, 'Sol Ring', DECK_LIST.MAINBOARD, DECK_LIST.ALTERNATES)
    expect(result.deck.cards).toHaveLength(0)
    expect(result.deck.alternates[0].quantity).toBe(3)
    expect(result.deck.alternates[0].roles).toEqual(expect.arrayContaining(['ramp', 'engine']))
    expect(result.meta.merged).toEqual(['Sol Ring'])
  })

  it('throws when card not in source', () => {
    const deck = makeDeck()
    expect(() => moveCard(deck, 'Nope', DECK_LIST.MAINBOARD, DECK_LIST.ALTERNATES)).toThrow('Card not found')
  })
})

describe('findCardAcrossLists', () => {
  it('finds card in mainboard', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring')] })
    const found = findCardAcrossLists(deck, 'Sol Ring')
    expect(found?.card.card.name).toBe('Sol Ring')
    expect(found?.list).toBe(DECK_LIST.MAINBOARD)
  })

  it('finds card in sideboard', () => {
    const deck = makeDeck({ sideboard: [makeDeckCard('Negate')] })
    const found = findCardAcrossLists(deck, 'Negate')
    expect(found?.list).toBe(DECK_LIST.SIDEBOARD)
  })

  it('finds card in alternates', () => {
    const deck = makeDeck({ alternates: [makeDeckCard('Path to Exile')] })
    const found = findCardAcrossLists(deck, 'Path to Exile')
    expect(found?.list).toBe(DECK_LIST.ALTERNATES)
  })

  it('returns undefined when not found', () => {
    const deck = makeDeck()
    expect(findCardAcrossLists(deck, 'Nope')).toBeUndefined()
  })

  it('is case-insensitive', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring')] })
    expect(findCardAcrossLists(deck, 'sol ring')).toBeDefined()
  })
})
