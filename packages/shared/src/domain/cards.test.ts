import { describe, it, expect } from 'vitest'
import { mergeCardIntoList, addCardToDeck, removeCardFromDeck, moveCard, findCardAcrossLists } from './cards.js'
import { getMainboard, getSideboard, getAlternates } from './card-sets.js'
import type { Deck, CardEntry } from '../types/index.js'
import { CARD_SET, CARD_SOURCE, FORMAT_TYPE, INCLUSION_STATUS, OWNERSHIP_STATUS } from '../types/index.js'

function makeEntry(name: string, overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1' },
    quantity: 1,
    inclusion: INCLUSION_STATUS.CONFIRMED,
    ownership: OWNERSHIP_STATUS.OWNED,
    roles: [],
    isPinned: false,
    addedAt: '2024-01-01T00:00:00.000Z',
    source: CARD_SOURCE.USER,
    ...overrides,
  }
}

interface MakeDeckOptions {
  mainboard?: CardEntry[]
  sideboard?: CardEntry[]
  alternates?: CardEntry[]
  format?: Deck['format']
  commanders?: Deck['commanders']
}

function makeDeck(opts: MakeDeckOptions = {}): Deck {
  return {
    id: 'test-deck',
    name: 'Test',
    format: opts.format ?? { type: FORMAT_TYPE.COMMANDER, deckSize: 100, sideboardSize: 0, cardLimit: 1, unlimitedCards: [] },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cardSets: [
      { name: CARD_SET.MAINBOARD, entries: opts.mainboard ?? [] },
      { name: CARD_SET.SIDEBOARD, entries: opts.sideboard ?? [] },
      { name: CARD_SET.ALTERNATES, entries: opts.alternates ?? [] },
    ],
    commanders: opts.commanders ?? [],
    customRoles: [],
    notes: [],
  }
}

describe('mergeCardIntoList', () => {
  it('appends when card is new', () => {
    const card = makeEntry('Sol Ring')
    const { list, merged } = mergeCardIntoList([], card)
    expect(list).toHaveLength(1)
    expect(merged).toBe(false)
  })

  it('merges quantity when card exists', () => {
    const existing = makeEntry('Sol Ring', { quantity: 1 })
    const incoming = makeEntry('Sol Ring', { quantity: 2 })
    const { list, merged } = mergeCardIntoList([existing], incoming)
    expect(list[0].quantity).toBe(3)
    expect(merged).toBe(true)
  })

  it('unions roles on merge', () => {
    const existing = makeEntry('Sol Ring', { roles: ['ramp'] })
    const incoming = makeEntry('Sol Ring', { roles: ['ramp', 'engine'] })
    const { list } = mergeCardIntoList([existing], incoming)
    expect(list[0].roles).toEqual(['ramp', 'engine'])
  })

  it('is case-insensitive on name', () => {
    const existing = makeEntry('Sol Ring')
    const incoming = makeEntry('sol ring', { quantity: 2 })
    const { merged } = mergeCardIntoList([existing], incoming)
    expect(merged).toBe(true)
  })

  it('does not mutate the input list', () => {
    const original = [makeEntry('Sol Ring', { quantity: 1 })]
    const incoming = makeEntry('Sol Ring', { quantity: 2 })
    mergeCardIntoList(original, incoming)
    expect(original[0].quantity).toBe(1)
  })

  it('merges notes', () => {
    const existing = makeEntry('Sol Ring', { notes: 'note A' })
    const incoming = makeEntry('Sol Ring', { notes: 'note B' })
    const { list } = mergeCardIntoList([existing], incoming)
    expect(list[0].notes).toBe('note A\nnote B')
  })
})

describe('addCardToDeck', () => {
  it('adds to mainboard', () => {
    const deck = makeDeck()
    const card = makeEntry('Sol Ring')
    const result = addCardToDeck(deck, card, CARD_SET.MAINBOARD)
    expect(getMainboard(result.deck)).toHaveLength(1)
    expect(result.meta.merged).toBe(false)
  })

  it('adds to sideboard', () => {
    const deck = makeDeck()
    const card = makeEntry('Sol Ring')
    const result = addCardToDeck(deck, card, CARD_SET.SIDEBOARD)
    expect(getSideboard(result.deck)).toHaveLength(1)
    expect(getMainboard(result.deck)).toHaveLength(0)
  })

  it('adds to alternates', () => {
    const deck = makeDeck()
    const card = makeEntry('Sol Ring')
    const result = addCardToDeck(deck, card, CARD_SET.ALTERNATES)
    expect(getAlternates(result.deck)).toHaveLength(1)
  })

  it('merges with existing card', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring', { quantity: 1 })] })
    const card = makeEntry('Sol Ring', { quantity: 2 })
    const result = addCardToDeck(deck, card, CARD_SET.MAINBOARD)
    expect(getMainboard(result.deck)[0].quantity).toBe(3)
    expect(result.meta.merged).toBe(true)
  })

  it('does not mutate the original deck', () => {
    const deck = makeDeck()
    const card = makeEntry('Sol Ring')
    addCardToDeck(deck, card, CARD_SET.MAINBOARD)
    expect(getMainboard(deck)).toHaveLength(0)
  })
})

describe('removeCardFromDeck', () => {
  it('removes entirely when no quantity specified', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring', { quantity: 4 })] })
    const result = removeCardFromDeck(deck, 'Sol Ring', CARD_SET.MAINBOARD)
    expect(getMainboard(result.deck)).toHaveLength(0)
    expect(result.meta.remainingQty).toBe(0)
  })

  it('decrements when quantity < current', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring', { quantity: 4 })] })
    const result = removeCardFromDeck(deck, 'Sol Ring', CARD_SET.MAINBOARD, 2)
    expect(getMainboard(result.deck)[0].quantity).toBe(2)
    expect(result.meta.remainingQty).toBe(2)
  })

  it('throws when card not found', () => {
    const deck = makeDeck()
    expect(() => removeCardFromDeck(deck, 'Nope', CARD_SET.MAINBOARD)).toThrow('Card not found')
  })

  it('does not mutate the original deck', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring')] })
    removeCardFromDeck(deck, 'Sol Ring', CARD_SET.MAINBOARD)
    expect(getMainboard(deck)).toHaveLength(1)
  })
})

describe('moveCard', () => {
  it('moves a singleton card with no quantity argument', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Sol Ring')],
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
    })
    const result = moveCard(deck, 'Sol Ring', CARD_SET.MAINBOARD, CARD_SET.SIDEBOARD)
    expect(getMainboard(result.deck)).toHaveLength(0)
    expect(getSideboard(result.deck)).toHaveLength(1)
    expect(result.meta.moved).toEqual(['Sol Ring'])
    expect(result.meta.merged).toEqual([])
  })

  it('preserves the source entry UUID on a full move', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring')] })
    const originalId = getMainboard(deck)[0].id
    const result = moveCard(deck, 'Sol Ring', CARD_SET.MAINBOARD, CARD_SET.SIDEBOARD)
    expect(getSideboard(result.deck)[0].id).toBe(originalId)
  })

  it('merges when target has same card', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Sol Ring', { quantity: 1, roles: ['ramp'] })],
      alternates: [makeEntry('Sol Ring', { quantity: 2, roles: ['engine'] })],
    })
    const result = moveCard(deck, 'Sol Ring', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES)
    expect(getMainboard(result.deck)).toHaveLength(0)
    expect(getAlternates(result.deck)[0].quantity).toBe(3)
    expect(getAlternates(result.deck)[0].roles).toEqual(expect.arrayContaining(['ramp', 'engine']))
    expect(result.meta.merged).toEqual(['Sol Ring'])
  })

  it('throws when card not in source', () => {
    const deck = makeDeck()
    expect(() => moveCard(deck, 'Nope', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES)).toThrow('Card not found')
  })

  it('throws when quantity is omitted and source has multiple copies', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Island', { quantity: 15 })] })
    expect(() => moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES))
      .toThrow(/Must specify quantity.*Island.*15 copies/)
  })

  it('moves the whole stack when explicit quantity matches source quantity', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Island', { quantity: 15 })] })
    const originalId = getMainboard(deck)[0].id
    const result = moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, 15)
    expect(getMainboard(result.deck)).toHaveLength(0)
    expect(getAlternates(result.deck)).toHaveLength(1)
    expect(getAlternates(result.deck)[0].quantity).toBe(15)
    expect(getAlternates(result.deck)[0].id).toBe(originalId)
  })

  it('splits the entry on a partial move, leaving the source decremented', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Island', { quantity: 15, roles: ['mana-fixer'] })] })
    const result = moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, 3)
    expect(getMainboard(result.deck)).toHaveLength(1)
    expect(getMainboard(result.deck)[0].quantity).toBe(12)
    expect(getAlternates(result.deck)).toHaveLength(1)
    expect(getAlternates(result.deck)[0].quantity).toBe(3)
    expect(getAlternates(result.deck)[0].roles).toEqual(['mana-fixer'])
  })

  it('assigns a new UUID to the target entry on a partial move', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Island', { quantity: 15 })] })
    const originalId = getMainboard(deck)[0].id
    const result = moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, 3)
    expect(getMainboard(result.deck)[0].id).toBe(originalId)
    expect(getAlternates(result.deck)[0].id).not.toBe(originalId)
  })

  it('throws when explicit quantity exceeds source quantity', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Island', { quantity: 3 })] })
    expect(() => moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, 5))
      .toThrow(/Cannot move 5.*only 3 available/)
  })

  it('throws on zero or negative quantity', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Island', { quantity: 3 })] })
    expect(() => moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, 0))
      .toThrow(/positive integer/)
    expect(() => moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, -1))
      .toThrow(/positive integer/)
  })

  it('merges a partial move into an existing target entry', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Island', { quantity: 10 })],
      alternates: [makeEntry('Island', { quantity: 2 })],
    })
    const result = moveCard(deck, 'Island', CARD_SET.MAINBOARD, CARD_SET.ALTERNATES, 4)
    expect(getMainboard(result.deck)[0].quantity).toBe(6)
    expect(getAlternates(result.deck)).toHaveLength(1)
    expect(getAlternates(result.deck)[0].quantity).toBe(6)
  })

  it('supports moving a singleton into the new cut set', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Grave Pact', { notes: 'too slow' })] })
    const result = moveCard(deck, 'Grave Pact', CARD_SET.MAINBOARD, CARD_SET.CUT)
    expect(getMainboard(result.deck)).toHaveLength(0)
    const cut = result.deck.cardSets.find(s => s.name === CARD_SET.CUT)?.entries ?? []
    expect(cut).toHaveLength(1)
    expect(cut[0].card.name).toBe('Grave Pact')
    expect(cut[0].notes).toBe('too slow')
  })
})

describe('findCardAcrossLists', () => {
  it('finds card in mainboard', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring')] })
    const found = findCardAcrossLists(deck, 'Sol Ring')
    expect(found?.card.card.name).toBe('Sol Ring')
    expect(found?.list).toBe(CARD_SET.MAINBOARD)
  })

  it('finds card in sideboard', () => {
    const deck = makeDeck({ sideboard: [makeEntry('Negate')] })
    const found = findCardAcrossLists(deck, 'Negate')
    expect(found?.list).toBe(CARD_SET.SIDEBOARD)
  })

  it('finds card in alternates', () => {
    const deck = makeDeck({ alternates: [makeEntry('Path to Exile')] })
    const found = findCardAcrossLists(deck, 'Path to Exile')
    expect(found?.list).toBe(CARD_SET.ALTERNATES)
  })

  it('returns undefined when not found', () => {
    const deck = makeDeck()
    expect(findCardAcrossLists(deck, 'Nope')).toBeUndefined()
  })

  it('is case-insensitive', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring')] })
    expect(findCardAcrossLists(deck, 'sol ring')).toBeDefined()
  })
})
