import { vi } from 'vitest'
import type { Storage } from '@mtg-deckbuilder/shared'
import {
  createEmptyDeck,
  generateDeckCardId,
  isValidUUID,
  CARD_SET,
  INTEREST_LIST_ID,
  type Deck,
  type CardEntry,
  type CardList,
  type ScryfallCard,
  type FormatType,
  type RoleDefinition,
  type SetCollectionFile,
} from '@mtg-deckbuilder/shared'

// Test helpers for mutating decks in place (used by existing tests that rely on `.push`)
export function pushMainboard(deck: Deck, ...cards: CardEntry[]): void {
  const set = deck.cardSets.find(s => s.name === CARD_SET.MAINBOARD)
  if (set) set.entries.push(...cards)
}
export function pushSideboard(deck: Deck, ...cards: CardEntry[]): void {
  const set = deck.cardSets.find(s => s.name === CARD_SET.SIDEBOARD)
  if (set) set.entries.push(...cards)
}
export function pushAlternates(deck: Deck, ...cards: CardEntry[]): void {
  const set = deck.cardSets.find(s => s.name === CARD_SET.ALTERNATES)
  if (set) set.entries.push(...cards)
}

export function createMockStorage() {
  const decks = new Map<string, Deck>()
  const cardLists = new Map<string, CardList>()
  const cachedCards = new Map<string, ScryfallCard>()
  let globalRoles: RoleDefinition[] = []
  let setCollection: SetCollectionFile = { version: 1, updatedAt: '', sets: [] }

  const storage = {
    listDecks: vi.fn(() => [...decks.values()]),
    // Mirror the real Storage.getDeck contract: throw on non-UUID input.
    // Without this, UUID-validation regressions in the shared layer are
    // invisible to the MCP test suite.
    getDeck: vi.fn((id: string) => {
      if (!isValidUUID(id)) throw new Error(`Invalid deck ID format: ${id}`)
      return decks.get(id) ?? null
    }),
    getDeckByName: vi.fn((name: string) => {
      for (const d of decks.values()) {
        if (d.name.toLowerCase() === name.toLowerCase()) return d
      }
      return null
    }),
    saveDeck: vi.fn((deck: Deck) => {
      decks.set(deck.id, deck)
    }),
    deleteDeck: vi.fn((id: string) => {
      if (!isValidUUID(id)) throw new Error(`Invalid deck ID format: ${id}`)
      if (decks.has(id)) {
        decks.delete(id)
        return true
      }
      return false
    }),
    getGlobalRoles: vi.fn(() => globalRoles),
    saveGlobalRoles: vi.fn((roles: RoleDefinition[]) => {
      globalRoles = roles
    }),
    listCardLists: vi.fn(() => [...cardLists.values()]),
    getCardList: vi.fn((id: string) => cardLists.get(id) ?? null),
    saveCardList: vi.fn((list: CardList) => {
      cardLists.set(list.id, list)
    }),
    deleteCardList: vi.fn((id: string) => {
      if (cardLists.has(id)) {
        cardLists.delete(id)
        return true
      }
      return false
    }),
    getTaxonomy: vi.fn(() => ({ version: 1, updatedAt: '', globalRoles })),
    saveTaxonomy: vi.fn(),
    getConfig: vi.fn(() => ({
      scryfallCacheExpiryDays: 7,
      theme: 'gothic' as const,
      imageCacheEnabled: true,
      imageCacheMaxSize: 500,
    })),
    saveConfig: vi.fn(),
    getCachedCard: vi.fn((scryfallId: string) => cachedCards.get(scryfallId) ?? null),
    getCachedCardByName: vi.fn((name: string) => {
      for (const card of cachedCards.values()) {
        if (card.name.toLowerCase() === name.toLowerCase()) return card
      }
      return null
    }),
    getCachedCardBySetCollector: vi.fn((setCode: string, collectorNumber: string) => {
      for (const card of cachedCards.values()) {
        if (card.set === setCode && card.collector_number === collectorNumber) return card
      }
      return null
    }),
    cacheCard: vi.fn(),
    cacheCardWithIndex: vi.fn((card: ScryfallCard) => { cachedCards.set(card.id, card) }),
    getSetCollection: vi.fn(() => setCollection),
    saveSetCollection: vi.fn(),
    getBasePath: vi.fn(() => '/tmp/test'),
    getDecksPath: vi.fn(() => '/tmp/test/decks'),
  }

  return {
    storage: storage as unknown as Storage,
    _decks: decks,
    _cardLists: cardLists,
    _cachedCards: cachedCards,
    _setGlobalRoles: (roles: RoleDefinition[]) => { globalRoles = roles },
    _setSetCollection: (col: SetCollectionFile) => { setCollection = col },
  }
}

// Re-export INTEREST_LIST_ID for test convenience
export { INTEREST_LIST_ID }

export function mockScryfallCard(name: string, overrides?: Partial<ScryfallCard>): ScryfallCard {
  return {
    id: `scryfall-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    cmc: 3,
    type_line: 'Creature — Human Wizard',
    color_identity: ['U'],
    colors: ['U'],
    set: 'test',
    collector_number: '1',
    rarity: 'rare',
    mana_cost: '{2}{U}',
    oracle_text: 'Test card',
    legalities: { commander: 'legal', standard: 'legal', modern: 'legal' },
    ...overrides,
  }
}

export function makeDeck(overrides?: Partial<Deck>): Deck {
  const deck = createEmptyDeck(overrides?.name ?? 'Test Deck', (overrides?.format?.type as FormatType) ?? 'commander')
  return { ...deck, ...overrides, format: overrides?.format ?? deck.format }
}

export function makeDeckCard(name: string, overrides?: Partial<CardEntry>): CardEntry {
  return {
    id: generateDeckCardId(),
    card: {
      scryfallId: `scryfall-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      setCode: 'test',
      collectorNumber: '1',
    },
    quantity: 1,
    ownership: 'owned',
    roles: [],
    addedAt: new Date().toISOString(),
    source: 'user',
    ...overrides,
  }
}

/**
 * Build a mock Scryfall cache keyed by the same `scryfall-${name}` ids that
 * `makeDeckCard` uses, so view rendering can resolve type lines without
 * touching the network. Pass `{ 'Sol Ring': 'Artifact' }` to get a cache that
 * answers `getTypeLine` for Sol Ring.
 */
export function makeMockCache(typeLines: Record<string, string>): Map<string, ScryfallCard> {
  const cache = new Map<string, ScryfallCard>()
  for (const [name, typeLine] of Object.entries(typeLines)) {
    const scryfallId = `scryfall-${name.toLowerCase().replace(/\s+/g, '-')}`
    cache.set(scryfallId, mockScryfallCard(name, { id: scryfallId, type_line: typeLine }))
  }
  return cache
}
