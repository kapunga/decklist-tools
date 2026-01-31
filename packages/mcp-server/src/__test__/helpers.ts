import { vi } from 'vitest'
import type { Storage } from '@mtg-deckbuilder/shared'
import {
  createEmptyDeck,
  generateDeckCardId,
  type Deck,
  type DeckCard,
  type ScryfallCard,
  type FormatType,
  type RoleDefinition,
  type InterestList,
} from '@mtg-deckbuilder/shared'

export function createMockStorage() {
  const decks = new Map<string, Deck>()
  let globalRoles: RoleDefinition[] = []
  let interestList: InterestList = { version: 1, updatedAt: '', items: [] }

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
    getInterestList: vi.fn(() => interestList),
    saveInterestList: vi.fn((list: InterestList) => {
      interestList = list
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
    cacheCard: vi.fn(),
    getBasePath: vi.fn(() => '/tmp/test'),
    getDecksPath: vi.fn(() => '/tmp/test/decks'),
  }

  return {
    storage: storage as unknown as Storage,
    _decks: decks,
    _setGlobalRoles: (roles: RoleDefinition[]) => { globalRoles = roles },
    _setInterestList: (list: InterestList) => { interestList = list },
  }
}

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

export function makeDeckCard(name: string, overrides?: Partial<DeckCard>): DeckCard {
  return {
    id: generateDeckCardId(),
    card: {
      scryfallId: `scryfall-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      setCode: 'test',
      collectorNumber: '1',
    },
    quantity: 1,
    inclusion: 'confirmed',
    ownership: 'owned',
    roles: [],
    typeLine: 'Creature — Human Wizard',
    isPinned: false,
    addedAt: new Date().toISOString(),
    addedBy: 'user',
    ...overrides,
  }
}
