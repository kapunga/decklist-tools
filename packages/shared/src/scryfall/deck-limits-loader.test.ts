import { describe, it, expect } from 'vitest'
import { getIntrinsicDeckLimit, FALLBACK_DECK_LIMITS } from './deck-limits-loader.js'
import type { ScryfallCard } from '../types/index.js'

function makeCard(name: string, oracleText: string): ScryfallCard {
  return {
    id: 'test',
    oracle_id: 'test',
    name,
    lang: 'en',
    released_at: '2024-01-01',
    mana_cost: '',
    cmc: 0,
    type_line: 'Creature',
    oracle_text: oracleText,
    colors: [],
    color_identity: [],
    keywords: [],
    legalities: {},
    set: 'tst',
    set_name: 'Test',
    collector_number: '1',
    rarity: 'common',
    artist: '',
    border_color: 'black',
    frame: '2015',
    full_art: false,
    textless: false,
    booster: false,
    story_spotlight: false,
    prices: { usd: null, usd_foil: null, eur: null, tix: null },
    related_uris: {},
    purchase_uris: {},
  } as unknown as ScryfallCard
}

describe('getIntrinsicDeckLimit', () => {
  it('returns Infinity for "any number" phrasing', () => {
    const card = makeCard('Relentless Rats', 'A deck can have any number of cards named Relentless Rats.')
    expect(getIntrinsicDeckLimit(card)).toBe(Infinity)
  })

  it('returns numeric limit for "up to seven"', () => {
    const card = makeCard('Seven Dwarves', 'A deck can have up to seven cards named Seven Dwarves.')
    expect(getIntrinsicDeckLimit(card)).toBe(7)
  })

  it('returns numeric limit for "up to nine"', () => {
    const card = makeCard('Nazgûl', 'A deck can have up to nine cards named Nazgûl.')
    expect(getIntrinsicDeckLimit(card)).toBe(9)
  })

  it('returns null for cards without the phrase', () => {
    const card = makeCard('Lightning Bolt', 'Lightning Bolt deals 3 damage to any target.')
    expect(getIntrinsicDeckLimit(card)).toBeNull()
  })

  it('returns null for unrecognized number words', () => {
    const card = makeCard('Mystery Card', 'A deck can have up to seventeen cards named Mystery Card.')
    expect(getIntrinsicDeckLimit(card)).toBeNull()
  })
})

describe('FALLBACK_DECK_LIMITS', () => {
  it('is in sync with parser output for every entry', () => {
    // Each fallback entry must be derivable from a card with the canonical phrasing.
    // This guards against drift between the parser and the hardcoded list.
    for (const [name, limit] of FALLBACK_DECK_LIMITS) {
      const phrase = limit === Infinity
        ? `A deck can have any number of cards named ${name}.`
        : `A deck can have up to ${numberToWord(limit)} cards named ${name}.`
      const card = makeCard(name, phrase)
      expect(getIntrinsicDeckLimit(card)).toBe(limit)
    }
  })

  it('contains the known set of cards as of April 2026', () => {
    const names = FALLBACK_DECK_LIMITS.map(([name]) => name).sort()
    expect(names).toEqual([
      'Cid, Timeless Artificer',
      "Dragon's Approach",
      'Hare Apparent',
      'Nazgûl',
      'Persistent Petitioners',
      'Rat Colony',
      'Relentless Rats',
      'Seven Dwarves',
      'Shadowborn Apostle',
      'Slime Against Humanity',
      'Tempest Hawk',
      'Templar Knight',
    ])
  })
})

function numberToWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
  return words[n] ?? String(n)
}
