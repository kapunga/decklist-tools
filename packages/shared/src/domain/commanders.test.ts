import { describe, it, expect } from 'vitest'
import { addCommander, removeCommander, swapCommander, getDeckColorIdentity } from './commanders.js'
import type { Deck, CardIdentifier, CardEntry } from '../types/index.js'
import { CARD_SET, CARD_SOURCE, FORMAT_TYPE, OWNERSHIP_STATUS } from '../types/index.js'

function makeCommander(name: string, colorIdentity: string[] = []): CardIdentifier {
  return { name, setCode: 'test', collectorNumber: '1', colorIdentity }
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
    format: opts.format ?? { type: FORMAT_TYPE.COMMANDER, deckSize: 100, sideboardSize: 0, cardLimit: 1, unlimitedCards: [] },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cardSets: [
      { name: CARD_SET.MAINBOARD, entries: opts.mainboard ?? [] },
      { name: CARD_SET.SIDEBOARD, entries: opts.sideboard ?? [] },
      { name: CARD_SET.ALTERNATES, entries: opts.alternates ?? [] },
      { name: CARD_SET.CUT, entries: opts.cut ?? [] },
    ],
    commanders: opts.commanders ?? [],
    customRoles: [],
    notes: [],
    colorIdentity: opts.colorIdentity,
  }
}

describe('addCommander', () => {
  it('adds commander and computes color identity', () => {
    const deck = makeDeck()
    const result = addCommander(deck, makeCommander('Kenrith', ['W', 'U', 'B', 'R', 'G']))
    expect(result.deck.commanders).toHaveLength(1)
    expect(result.meta.commanders).toEqual(['Kenrith'])
    expect(result.meta.colorIdentity).toEqual(expect.arrayContaining(['W', 'U', 'B', 'R', 'G']))
    expect(result.deck.colorIdentity).toEqual(result.meta.colorIdentity)
  })

  it('combines color identity from multiple commanders', () => {
    const deck = makeDeck({ commanders: [makeCommander('Partner A', ['W', 'U'])] })
    const result = addCommander(deck, makeCommander('Partner B', ['B', 'R']))
    expect(result.meta.colorIdentity).toEqual(expect.arrayContaining(['W', 'U', 'B', 'R']))
  })

  it('throws on duplicate commander', () => {
    const deck = makeDeck({ commanders: [makeCommander('Kenrith', ['W'])] })
    expect(() => addCommander(deck, makeCommander('Kenrith', ['W']))).toThrow('already a commander')
  })

  it('throws for non-commander format', () => {
    const deck = makeDeck({ format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] } })
    expect(() => addCommander(deck, makeCommander('X'))).toThrow('Commander format')
  })

  it('does not mutate the original deck', () => {
    const deck = makeDeck()
    addCommander(deck, makeCommander('Kenrith', ['W']))
    expect(deck.commanders).toHaveLength(0)
  })

  it('handles commanders with no stored colorIdentity', () => {
    const deck = makeDeck()
    const result = addCommander(deck, makeCommander('Old Commander'))
    expect(result.deck.colorIdentity).toEqual([])
  })
})

describe('removeCommander', () => {
  it('removes commander and recomputes color identity', () => {
    const deck = makeDeck({
      commanders: [makeCommander('Kenrith', ['W', 'U', 'B', 'R', 'G'])],
      colorIdentity: ['W', 'U', 'B', 'R', 'G'],
    })
    const result = removeCommander(deck, 'Kenrith')
    expect(result.deck.commanders).toHaveLength(0)
    expect(result.deck.colorIdentity).toEqual([])
  })

  it('throws when not found', () => {
    const deck = makeDeck()
    expect(() => removeCommander(deck, 'Nope')).toThrow('not a commander')
  })

  it('is case-insensitive', () => {
    const deck = makeDeck({ commanders: [makeCommander('Kenrith', ['W'])] })
    const result = removeCommander(deck, 'kenrith')
    expect(result.deck.commanders).toHaveLength(0)
  })
})

describe('swapCommander', () => {
  it('swaps and recomputes color identity', () => {
    const deck = makeDeck({
      commanders: [makeCommander('Kenrith', ['W', 'U', 'B', 'R', 'G'])],
      colorIdentity: ['W', 'U', 'B', 'R', 'G'],
    })
    const result = swapCommander(deck, 'Kenrith', makeCommander('Atraxa', ['W', 'U', 'B', 'G']))
    expect(result.meta.commanders).toEqual(['Atraxa'])
    expect(result.meta.colorIdentity).toEqual(expect.arrayContaining(['W', 'U', 'B', 'G']))
    expect(result.meta.colorIdentity).not.toContain('R')
  })

  it('throws when old commander not found', () => {
    const deck = makeDeck()
    expect(() => swapCommander(deck, 'Nope', makeCommander('X'))).toThrow('not a commander')
  })

  it('throws when new commander already exists', () => {
    const deck = makeDeck({
      commanders: [makeCommander('A', ['W']), makeCommander('B', ['U'])],
    })
    expect(() => swapCommander(deck, 'A', makeCommander('B', ['U']))).toThrow('already a commander')
  })
})

// --- getDeckColorIdentity ---

function makeEntry(name: string, overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: `card-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1' },
    quantity: 1,
    ownership: OWNERSHIP_STATUS.UNKNOWN,
    roles: [],
    addedAt: '2024-01-01T00:00:00.000Z',
    source: CARD_SOURCE.USER,
    ...overrides,
  }
}

describe('getDeckColorIdentity', () => {
  it('returns stored colorIdentity for commander decks', () => {
    const deck = makeDeck({ colorIdentity: ['W', 'U'] })
    expect(getDeckColorIdentity(deck)).toEqual(['W', 'U'])
  })

  it('returns empty array for colorless commander decks', () => {
    const deck = makeDeck({ colorIdentity: [] })
    expect(getDeckColorIdentity(deck)).toEqual([])
  })

  it('returns empty array for commander decks with undefined colorIdentity', () => {
    const deck = makeDeck({ colorIdentity: undefined })
    expect(getDeckColorIdentity(deck)).toEqual([])
  })

  it('computes union of card colors for non-commander decks', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      mainboard: [
        makeEntry('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } }),
        makeEntry('Counterspell', { card: { name: 'Counterspell', setCode: 'test', collectorNumber: '2', colorIdentity: ['U'] } }),
      ],
    })
    expect(getDeckColorIdentity(deck)).toEqual(expect.arrayContaining(['R', 'U']))
    expect(getDeckColorIdentity(deck)).toHaveLength(2)
  })

  it('includes sideboard colors for non-commander decks', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.MODERN, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      mainboard: [
        makeEntry('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } }),
      ],
      sideboard: [
        makeEntry('Path', { card: { name: 'Path', setCode: 'test', collectorNumber: '2', colorIdentity: ['W'] } }),
      ],
    })
    expect(getDeckColorIdentity(deck)).toEqual(expect.arrayContaining(['R', 'W']))
  })

  it('skips cards in the cut set for non-commander decks', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.STANDARD, deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] },
      mainboard: [
        makeEntry('Bolt', { card: { name: 'Bolt', setCode: 'test', collectorNumber: '1', colorIdentity: ['R'] } }),
      ],
      cut: [
        makeEntry('Growth', {
          card: { name: 'Growth', setCode: 'test', collectorNumber: '2', colorIdentity: ['G'] },
        }),
      ],
    })
    expect(getDeckColorIdentity(deck)).toEqual(['R'])
  })

  it('returns empty array for non-commander decks with no cards', () => {
    const deck = makeDeck({
      format: { type: FORMAT_TYPE.KITCHEN_TABLE, deckSize: 60, sideboardSize: 15, cardLimit: Infinity, unlimitedCards: [] },
    })
    expect(getDeckColorIdentity(deck)).toEqual([])
  })
})
