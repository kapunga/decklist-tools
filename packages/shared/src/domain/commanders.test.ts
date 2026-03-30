import { describe, it, expect } from 'vitest'
import { addCommander, removeCommander, swapCommander } from './commanders.js'
import type { Deck, CardIdentifier } from '../types/index.js'
import { FORMAT_TYPE } from '../types/index.js'

function makeCommander(name: string, colorIdentity: string[] = []): CardIdentifier {
  return { name, setCode: 'test', collectorNumber: '1', colorIdentity }
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
