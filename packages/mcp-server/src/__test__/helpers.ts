import { vi } from 'vitest'
import type { Storage } from '@mtg-deckbuilder/shared'
import {
  createEmptyDeck,
  generateDeckCardId,
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
  let globalRoles: RoleDefinition[] = []
  let setCollection: SetCollectionFile = { version: 1, updatedAt: '', sets: [] }

  const storage = {
    listDecks: vi.fn(() => [...decks.values()]),
    getDeck: vi.fn((id: string) => decks.get(id) ?? null),
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
      theme: 'dark' as const,
      imageCacheEnabled: true,
      imageCacheMaxSize: 500,
    })),
    saveConfig: vi.fn(),
    getCachedCard: vi.fn(() => null),
    getCachedCardByName: vi.fn(() => null),
    getCachedCardBySetCollector: vi.fn(() => null),
    cacheCard: vi.fn(),
    cacheCardWithIndex: vi.fn(),
    getSetCollection: vi.fn(() => setCollection),
    saveSetCollection: vi.fn(),
    getBasePath: vi.fn(() => '/tmp/test'),
    getDecksPath: vi.fn(() => '/tmp/test/decks'),
  }

  return {
    storage: storage as unknown as Storage,
    _decks: decks,
    _cardLists: cardLists,
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
    typeLine: 'Creature — Human Wizard',
    addedAt: new Date().toISOString(),
    source: 'user',
    ...overrides,
  }
}
