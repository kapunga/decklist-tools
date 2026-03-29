import { describe, it, expect } from 'vitest'
import {
  validateDeckSize,
  validateSideboardSize,
  validateCardLimits,
  validateCommanderPresence,
  validateColorIdentity,
  validateDeckStructure,
} from './validators.js'
import { ISSUE_CATEGORY } from './types.js'
import type { Deck, DeckCard } from '../types/index.js'
import { FORMAT_TYPE, INCLUSION_STATUS, OWNERSHIP_STATUS, ADDED_BY } from '../types/index.js'

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
    commanders: [{ name: 'Kenrith', setCode: 'eld', collectorNumber: '303', colorIdentity: ['W', 'U', 'B', 'R', 'G'] }],
    customRoles: [],
    notes: [],
    colorIdentity: ['W', 'U', 'B', 'R', 'G'],
    ...overrides,
  }
}

describe('validateDeckSize', () => {
  it('reports undersize deck', () => {
    const deck = makeDeck({ cards: [makeDeckCard('Sol Ring')] })
    const issues = validateDeckSize(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].category).toBe(ISSUE_CATEGORY.STRUCTURE)
    expect(issues[0].code).toBe('deck_undersize')
  })

  it('reports oversize commander deck', () => {
    const cards = Array.from({ length: 100 }, (_, i) => makeDeckCard(`Card ${i}`))
    const deck = makeDeck({ cards })
    // 100 cards + 1 commander = 101, over the 100 limit
    const issues = validateDeckSize(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('deck_oversize')
  })

  it('passes for correctly sized deck', () => {
    const cards = Array.from({ length: 99 }, (_, i) => makeDeckCard(`Card ${i}`))
    const deck = makeDeck({ cards })
    // 99 cards + 1 commander = 100, exactly right
    expect(validateDeckSize(deck)).toHaveLength(0)
  })
})

describe('validateSideboardSize', () => {
  it('reports oversize sideboard', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      sideboard: Array.from({ length: 16 }, (_, i) => makeDeckCard(`SB ${i}`)),
      commanders: [],
    })
    const issues = validateSideboardSize(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('sideboard_oversize')
  })

  it('passes for valid sideboard', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      sideboard: [makeDeckCard('Negate')],
      commanders: [],
    })
    expect(validateSideboardSize(deck)).toHaveLength(0)
  })
})

describe('validateCardLimits', () => {
  it('reports when card exceeds limit', () => {
    const deck = makeDeck({
      cards: [makeDeckCard('Sol Ring', { quantity: 2 })],
    })
    const issues = validateCardLimits(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('card_limit_exceeded')
  })

  it('allows unlimited cards', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.COMMANDER, deckSize: 100, sideboardSize: 0, cardLimit: 1, unlimitedCards: ['Relentless Rats'] },
      cards: [makeDeckCard('Relentless Rats', { quantity: 30 })],
    })
    expect(validateCardLimits(deck)).toHaveLength(0)
  })

  it('skips cut cards', () => {
    const deck = makeDeck({
      cards: [makeDeckCard('Sol Ring', { quantity: 2, inclusion: INCLUSION_STATUS.CUT })],
    })
    expect(validateCardLimits(deck)).toHaveLength(0)
  })

  it('aggregates across all lists', () => {
    const deck = makeDeck({
      cards: [makeDeckCard('Sol Ring', { quantity: 1 })],
      sideboard: [makeDeckCard('Sol Ring', { quantity: 1 })],
    })
    // 2 total copies, limit is 1
    const issues = validateCardLimits(deck)
    expect(issues).toHaveLength(1)
  })
})

describe('validateCommanderPresence', () => {
  it('reports missing commander', () => {
    const deck = makeDeck({ commanders: [] })
    const issues = validateCommanderPresence(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('no_commander')
  })

  it('passes when commander present', () => {
    const deck = makeDeck()
    expect(validateCommanderPresence(deck)).toHaveLength(0)
  })

  it('does not require commander for non-commander formats', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      commanders: [],
    })
    expect(validateCommanderPresence(deck)).toHaveLength(0)
  })
})

describe('validateColorIdentity', () => {
  it('reports color identity violation', () => {
    const deck = makeDeck({
      colorIdentity: ['W', 'U'],
      cards: [makeDeckCard('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } })],
    })
    const issues = validateColorIdentity(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].category).toBe(ISSUE_CATEGORY.LEGALITY)
    expect(issues[0].code).toBe('color_identity_violation')
  })

  it('passes for cards within identity', () => {
    const deck = makeDeck({
      colorIdentity: ['W', 'U', 'B', 'R', 'G'],
      cards: [makeDeckCard('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } })],
    })
    expect(validateColorIdentity(deck)).toHaveLength(0)
  })

  it('skips cards without stored colorIdentity', () => {
    const deck = makeDeck({
      colorIdentity: ['W'],
      cards: [makeDeckCard('Old Card')], // no colorIdentity on CardIdentifier
    })
    expect(validateColorIdentity(deck)).toHaveLength(0)
  })

  it('skips non-commander formats', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      commanders: [],
      colorIdentity: undefined,
    })
    expect(validateColorIdentity(deck)).toHaveLength(0)
  })
})

describe('validateDeckStructure (composed)', () => {
  it('returns multiple issues', () => {
    const deck = makeDeck({
      cards: [makeDeckCard('Sol Ring', { quantity: 2 })],
      commanders: [],
    })
    const issues = validateDeckStructure(deck)
    // undersize + card limit exceeded + no commander
    expect(issues.length).toBeGreaterThanOrEqual(2)
    expect(issues.every(i => i.category === ISSUE_CATEGORY.STRUCTURE)).toBe(true)
  })
})
