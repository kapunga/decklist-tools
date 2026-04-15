import { describe, it, expect, beforeAll } from 'vitest'
import {
  validateDeckSize,
  validateSideboardSize,
  validateCardLimits,
  validateCommanderPresence,
  validateColorIdentity,
  validateDeckStructure,
} from './validators.js'
import { ISSUE_CATEGORY } from './types.js'
import type { Deck, CardEntry } from '../types/index.js'
import { CARD_SET, CARD_SOURCE, FORMAT_TYPE, OWNERSHIP_STATUS } from '../types/index.js'
import { setDeckLimits } from '../cards/deck-limits.js'
import { FALLBACK_DECK_LIMITS } from '../scryfall/deck-limits-loader.js'

beforeAll(() => {
  setDeckLimits(FALLBACK_DECK_LIMITS)
})

function makeEntry(name: string, overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1' },
    quantity: 1,
    ownership: OWNERSHIP_STATUS.OWNED,
    roles: [],
    addedAt: '2024-01-01T00:00:00.000Z',
    source: CARD_SOURCE.USER,
    ...overrides,
  }
}

interface MakeDeckOptions {
  mainboard?: CardEntry[]
  sideboard?: CardEntry[]
  alternates?: CardEntry[]
  cut?: CardEntry[]
  format?: Deck['format']
  commanders?: Deck['commanders']
  colorIdentity?: string[]
}

function makeDeck(opts: MakeDeckOptions = {}): Deck {
  return {
    id: 'test-deck',
    name: 'Test',
    format: opts.format ?? { type: FORMAT_TYPE.COMMANDER, deckSize: 100, sideboardSize: 0, cardLimit: 1 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cardSets: [
      { name: CARD_SET.MAINBOARD, entries: opts.mainboard ?? [] },
      { name: CARD_SET.SIDEBOARD, entries: opts.sideboard ?? [] },
      { name: CARD_SET.ALTERNATES, entries: opts.alternates ?? [] },
      { name: CARD_SET.CUT, entries: opts.cut ?? [] },
    ],
    commanders: opts.commanders ?? [{ name: 'Kenrith', setCode: 'eld', collectorNumber: '303', colorIdentity: ['W', 'U', 'B', 'R', 'G'] }],
    customRoles: [],
    notes: [],
    colorIdentity: opts.colorIdentity ?? ['W', 'U', 'B', 'R', 'G'],
  }
}

describe('validateDeckSize', () => {
  it('reports undersize deck', () => {
    const deck = makeDeck({ mainboard: [makeEntry('Sol Ring')] })
    const issues = validateDeckSize(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].category).toBe(ISSUE_CATEGORY.STRUCTURE)
    expect(issues[0].code).toBe('deck_undersize')
  })

  it('reports oversize commander deck', () => {
    const mainboard = Array.from({ length: 100 }, (_, i) => makeEntry(`Card ${i}`))
    const deck = makeDeck({ mainboard })
    // 100 cards + 1 commander = 101, over the 100 limit
    const issues = validateDeckSize(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('deck_oversize')
  })

  it('passes for correctly sized deck', () => {
    const mainboard = Array.from({ length: 99 }, (_, i) => makeEntry(`Card ${i}`))
    const deck = makeDeck({ mainboard })
    // 99 cards + 1 commander = 100, exactly right
    expect(validateDeckSize(deck)).toHaveLength(0)
  })
})

describe('validateSideboardSize', () => {
  it('reports oversize sideboard', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4 },
      sideboard: Array.from({ length: 16 }, (_, i) => makeEntry(`SB ${i}`)),
      commanders: [],
    })
    const issues = validateSideboardSize(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('sideboard_oversize')
  })

  it('passes for valid sideboard', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4 },
      sideboard: [makeEntry('Negate')],
      commanders: [],
    })
    expect(validateSideboardSize(deck)).toHaveLength(0)
  })
})

describe('validateCardLimits', () => {
  it('reports when card exceeds limit', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Sol Ring', { quantity: 2 })],
    })
    const issues = validateCardLimits(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('card_limit_exceeded')
  })

  it('allows unlimited cards via card-intrinsic limit (Relentless Rats)', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Relentless Rats', { quantity: 30 })],
    })
    expect(validateCardLimits(deck)).toHaveLength(0)
  })

  it('allows card-intrinsic N-limited cards (Seven Dwarves: 7)', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Seven Dwarves', { quantity: 7 })],
    })
    expect(validateCardLimits(deck)).toHaveLength(0)
  })

  it('flags card-intrinsic N-limited cards when exceeded', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Seven Dwarves', { quantity: 8 })],
    })
    expect(validateCardLimits(deck)).toHaveLength(1)
  })

  it('skips cards in the cut set', () => {
    const deck = makeDeck({
      cut: [makeEntry('Sol Ring', { quantity: 2 })],
    })
    expect(validateCardLimits(deck)).toHaveLength(0)
  })

  it('aggregates across all lists', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Sol Ring', { quantity: 1 })],
      sideboard: [makeEntry('Sol Ring', { quantity: 1 })],
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
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4 },
      commanders: [],
    })
    expect(validateCommanderPresence(deck)).toHaveLength(0)
  })
})

describe('validateColorIdentity', () => {
  it('reports color identity violation', () => {
    const deck = makeDeck({
      colorIdentity: ['W', 'U'],
      mainboard: [makeEntry('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } })],
    })
    const issues = validateColorIdentity(deck)
    expect(issues).toHaveLength(1)
    expect(issues[0].category).toBe(ISSUE_CATEGORY.LEGALITY)
    expect(issues[0].code).toBe('color_identity_violation')
  })

  it('passes for cards within identity', () => {
    const deck = makeDeck({
      colorIdentity: ['W', 'U', 'B', 'R', 'G'],
      mainboard: [makeEntry('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } })],
    })
    expect(validateColorIdentity(deck)).toHaveLength(0)
  })

  it('skips cards without stored colorIdentity', () => {
    const deck = makeDeck({
      colorIdentity: ['W'],
      mainboard: [makeEntry('Old Card')], // no colorIdentity on CardIdentifier
    })
    expect(validateColorIdentity(deck)).toHaveLength(0)
  })

  it('skips non-commander formats', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4 },
      commanders: [],
      colorIdentity: undefined,
    })
    expect(validateColorIdentity(deck)).toHaveLength(0)
  })
})

describe('validateDeckStructure (composed)', () => {
  it('returns multiple issues', () => {
    const deck = makeDeck({
      mainboard: [makeEntry('Sol Ring', { quantity: 2 })],
      commanders: [],
    })
    const issues = validateDeckStructure(deck)
    // undersize + card limit exceeded + no commander
    expect(issues.length).toBeGreaterThanOrEqual(2)
    expect(issues.every(i => i.category === ISSUE_CATEGORY.STRUCTURE)).toBe(true)
  })
})

