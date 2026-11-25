import { describe, it, expect } from 'vitest'
import { pickHeroId } from './deckHero'

const spell = (id: string, cmc: number) => ({ id, cmc, type_line: 'Creature — Elf' })
const land = (id: string) => ({ id, cmc: 0, type_line: 'Basic Land — Forest' })

describe('pickHeroId', () => {
  it('returns null for no cards', () => {
    expect(pickHeroId('deck-1', [])).toBeNull()
  })

  it('returns null when every card is a land', () => {
    expect(pickHeroId('deck-1', [land('a'), land('b')])).toBeNull()
  })

  it('picks the highest mana value non-land', () => {
    expect(pickHeroId('deck-1', [spell('a', 2), spell('b', 7), land('c'), spell('d', 4)])).toBe('b')
  })

  it('never picks a land, even one with the highest mana value', () => {
    const expensiveLand = { id: 'l', cmc: 9, type_line: 'Land' }

    expect(pickHeroId('deck-1', [expensiveLand, spell('a', 1)])).toBe('a')
  })

  it('picks the same card among ties whatever order the cards arrive in', () => {
    const tied = [spell('a', 5), spell('b', 5), spell('c', 5), spell('d', 5)]

    const forward = pickHeroId('deck-1', tied)
    const backward = pickHeroId('deck-1', [...tied].reverse())

    expect(backward).toBe(forward)
  })

  it('spreads ties across decks by deck id', () => {
    const tied = [spell('a', 5), spell('b', 5), spell('c', 5), spell('d', 5)]
    const deckIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8']

    const picks = new Set(deckIds.map(id => pickHeroId(id, tied)))

    expect(picks.size).toBeGreaterThan(1)
  })

  it('treats a missing mana value as zero', () => {
    const noCmc = { id: 'x', type_line: 'Instant' }

    expect(pickHeroId('deck-1', [noCmc, spell('a', 1)])).toBe('a')
  })
})
