import { describe, it, expect } from 'vitest'
import { buildBuyList } from './useStore'
import { FORMAT_TYPE, formatDefaults } from '@mtg-deckbuilder/shared'
import type { Deck, CardEntry, CardSet } from '@/types'

function entry(name: string, quantity: number, ownership: CardEntry['ownership']): CardEntry {
  return {
    id: name,
    card: { name, scryfallId: 'sf-1', setCode: 'abc', collectorNumber: '1' },
    addedAt: '2026-01-01T00:00:00.000Z',
    source: 'user',
    quantity,
    ownership,
    roles: []
  }
}

function deck(id: string, name: string, cardSets: CardSet[]): Deck {
  return {
    id,
    name,
    format: formatDefaults[FORMAT_TYPE.COMMANDER],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    cardSets,
    commanders: [],
    customRoles: [],
    notes: []
  }
}

describe('buildBuyList', () => {
  it('includes need-to-buy cards from the alternates set, not just mainboard', () => {
    const decks = [
      deck('d1', 'Draw Two', [
        { name: 'mainboard', entries: [] },
        { name: 'alternates', entries: [entry('Consider', 4, 'need_to_buy')] }
      ])
    ]

    const buyList = buildBuyList(decks)

    expect(buyList.map(i => i.cardName)).toContain('Consider')
  })

  it('excludes cards in the cut set', () => {
    const decks = [
      deck('d1', 'Niv-Mizzet, Spellslinger', [
        { name: 'mainboard', entries: [] },
        { name: 'cut', entries: [entry('Harmonic Prodigy', 1, 'need_to_buy')] }
      ])
    ]

    const buyList = buildBuyList(decks)

    expect(buyList.map(i => i.cardName)).not.toContain('Harmonic Prodigy')
  })
})
