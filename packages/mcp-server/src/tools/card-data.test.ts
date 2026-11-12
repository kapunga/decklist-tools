import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ScryfallCard } from '@mtg-deckbuilder/shared'
import { createMockStorage, makeDeck, makeDeckCard, mockScryfallCard, pushMainboard } from '../__test__/helpers.js'
import { loadCardData, type CardFetcher } from './card-data.js'
import { deckList, deckCurve, deckPullList } from './deck-tools.js'

let mock: ReturnType<typeof createMockStorage>

beforeEach(() => {
  mock = createMockStorage()
})

const bolt = mockScryfallCard('Lightning Bolt', {
  cmc: 1,
  mana_cost: '{R}',
  type_line: 'Instant',
  oracle_text: 'ZAP-TO-THE-FACE',
})

function fetcherReturning(...cards: ScryfallCard[]) {
  return vi.fn<CardFetcher>(async ids => cards.filter(c => ids.includes(c.id)))
}

function seedDeck() {
  const deck = makeDeck({ name: 'Uncached' })
  pushMainboard(deck, makeDeckCard('Lightning Bolt', { quantity: 4, primaryType: 'Instant' }))
  mock._decks.set(deck.id, deck)
  return deck
}

describe('fetch-then-render for uncached cards', () => {
  it('fetches missing cards, writes them to the cache, and renders them fully', async () => {
    const deck = seedDeck()
    const fetchCards = fetcherReturning(bolt)

    const list = await deckList(mock.storage, { deck_id: deck.id }, fetchCards)

    expect(fetchCards).toHaveBeenCalledWith(['scryfall-lightning-bolt'])
    expect(mock.storage.cacheCardsWithIndex).toHaveBeenCalledWith([bolt])
    expect(list).toContain('ZAP-TO-THE-FACE')
    expect(list).not.toContain('Warning')
  })

  it('renders the fetched mana value in the curve', async () => {
    const deck = seedDeck()
    const curve = await deckCurve(mock.storage, { deck_id: deck.id }, fetcherReturning(bolt))
    expect(curve).toMatch(/^1 +█+ 4$/m)
    expect(curve).not.toContain('Warning')
  })

  it('makes no fetch call when every card is cached', async () => {
    const deck = seedDeck()
    mock._cachedCards.set(bolt.id, bolt)
    const fetchCards = fetcherReturning(bolt)

    await deckList(mock.storage, { deck_id: deck.id }, fetchCards)
    await deckCurve(mock.storage, { deck_id: deck.id }, fetchCards)
    await deckPullList(mock.storage, { deck_id: deck.id }, fetchCards)

    expect(fetchCards).not.toHaveBeenCalled()
  })
})

describe('unresolvable cards', () => {
  const failures: [string, CardFetcher][] = [
    ['returns nothing', async () => []],
    ['throws', async () => { throw new Error('rate limited') }],
  ]

  it.each(failures)('deck_curve warns and excludes them from the curve when the fetcher %s', async (_label, fetchCards) => {
    const deck = seedDeck()
    const curve = await deckCurve(mock.storage, { deck_id: deck.id }, fetchCards)

    expect(curve).toContain('Warning')
    expect(curve).toContain('Lightning Bolt')
    expect(curve).not.toMatch(/^0 +█/m)
    expect(curve).toContain('Of the cards without Scryfall data, 4 are nonland cards and are excluded from the curve and pips.')
    expect(curve).toMatch(/^Instant +█+ 4$/m)
  })

  it.each(failures)('deck_list warns and marks the card when the fetcher %s', async (_label, fetchCards) => {
    const deck = seedDeck()
    const list = await deckList(mock.storage, { deck_id: deck.id }, fetchCards)

    expect(list).toContain('Warning')
    expect(list).toContain('oracle text, mana value and mana pips are missing')
    expect(list).toMatch(/4x Lightning Bolt.*\[no Scryfall data\]/)
  })

  it('deck_pull_list warns about unresolved cards', async () => {
    const deck = seedDeck()
    const pull = await deckPullList(mock.storage, { deck_id: deck.id }, async () => [])
    expect(pull).toContain('Warning')
    expect(pull).toContain('Lightning Bolt')
  })
})

describe('loadCardData bounds', () => {
  it('caps the number of ids sent to the fetcher', async () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeDeckCard(`Card ${i}`))
    const fetchCards = vi.fn<CardFetcher>(async () => [])

    const { unresolved } = await loadCardData(mock.storage, entries, fetchCards, { maxCards: 2, timeoutMs: 1000 })

    expect(fetchCards).toHaveBeenCalledWith(['scryfall-card-0', 'scryfall-card-1'])
    expect(unresolved).toHaveLength(5)
  })

  it('gives up on a fetch that outlives the timeout and reports the cards unresolved', async () => {
    const entries = [makeDeckCard('Lightning Bolt')]
    const never: CardFetcher = () => new Promise(() => {})

    const { unresolved } = await loadCardData(mock.storage, entries, never, { maxCards: 10, timeoutMs: 10 })

    expect(unresolved.map(e => e.card.name)).toEqual(['Lightning Bolt'])
  })

  it('still renders when the cache write fails', async () => {
    vi.mocked(mock.storage.cacheCardsWithIndex).mockImplementation(() => { throw new Error('disk full') })
    const { cache, unresolved } = await loadCardData(mock.storage, [makeDeckCard('Lightning Bolt')], fetcherReturning(bolt))
    expect(cache.get(bolt.id)).toBe(bolt)
    expect(unresolved).toEqual([])
  })
})
