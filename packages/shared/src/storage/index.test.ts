import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Storage } from './index.js'
import type { Deck, InterestList, Config } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'Test Deck',
    format: {
      type: 'commander',
      deckSize: 100,
      sideboardSize: 0,
      cardLimit: 1,
      unlimitedCards: ['Relentless Rats', 'Rat Colony', 'Shadowborn Apostle'],
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    cardSets: [
      { name: CARD_SET.MAINBOARD, entries: [] },
      { name: CARD_SET.SIDEBOARD, entries: [] },
      { name: CARD_SET.ALTERNATES, entries: [] },
    ],
    commanders: [],
    customRoles: [],
    notes: [],
    ...overrides,
  }
}

let tmpDir: string
let storage: Storage

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'))
  storage = new Storage(tmpDir)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('Storage', () => {
  describe('constructor', () => {
    it('creates required directories', () => {
      expect(fs.existsSync(path.join(tmpDir, 'decks'))).toBe(true)
      expect(fs.existsSync(path.join(tmpDir, 'cache', 'scryfall'))).toBe(true)
      expect(fs.existsSync(path.join(tmpDir, 'cache', 'images'))).toBe(true)
    })

    it('creates default global-roles.json', () => {
      expect(fs.existsSync(path.join(tmpDir, 'global-roles.json'))).toBe(true)
      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'global-roles.json'), 'utf-8'))
      expect(data.version).toBe(1)
      expect(data.roles.length).toBeGreaterThan(0)
    })
  })

  describe('deck CRUD', () => {
    it('saveDeck and getDeck round-trip', () => {
      const deck = makeDeck()
      storage.saveDeck(deck)
      const loaded = storage.getDeck(deck.id)
      expect(loaded).not.toBeNull()
      expect(loaded!.name).toBe('Test Deck')
      expect(loaded!.version).toBe(3) // saveDeck increments version; getDeck runs schema migration (another save)
    })

    it('listDecks returns saved decks', () => {
      storage.saveDeck(makeDeck({ id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111', name: 'Deck A' }))
      storage.saveDeck(makeDeck({ id: 'aaaaaaaa-bbbb-cccc-dddd-222222222222', name: 'Deck B' }))
      const decks = storage.listDecks()
      expect(decks).toHaveLength(2)
      const names = decks.map(d => d.name).sort()
      expect(names).toEqual(['Deck A', 'Deck B'])
    })

    it('getDeck returns null for non-existent deck', () => {
      expect(storage.getDeck('aaaaaaaa-bbbb-cccc-dddd-ffffffffffff')).toBeNull()
    })

    it('deleteDeck removes the file', () => {
      const deck = makeDeck()
      storage.saveDeck(deck)
      expect(storage.deleteDeck(deck.id)).toBe(true)
      expect(storage.getDeck(deck.id)).toBeNull()
    })

    it('deleteDeck returns false for non-existent deck', () => {
      expect(storage.deleteDeck('aaaaaaaa-bbbb-cccc-dddd-ffffffffffff')).toBe(false)
    })

    it('getDeckByName is case-insensitive', () => {
      storage.saveDeck(makeDeck({ name: 'My Fancy Deck' }))
      expect(storage.getDeckByName('my fancy deck')).not.toBeNull()
      expect(storage.getDeckByName('MY FANCY DECK')).not.toBeNull()
    })

    it('getDeckByName returns null when not found', () => {
      expect(storage.getDeckByName('nonexistent')).toBeNull()
    })
  })

  describe('UUID validation', () => {
    it('getDeck rejects invalid IDs', () => {
      expect(() => storage.getDeck('../etc/passwd')).toThrow('Invalid deck ID format')
    })

    it('deleteDeck rejects invalid IDs', () => {
      expect(() => storage.deleteDeck('not-a-uuid')).toThrow('Invalid deck ID format')
    })

    it('getCachedCard rejects invalid Scryfall IDs', () => {
      expect(() => storage.getCachedCard('../malicious')).toThrow('Invalid Scryfall ID format')
    })

    it('cacheCard rejects invalid Scryfall IDs', () => {
      expect(() => storage.cacheCard('bad-id', {})).toThrow('Invalid Scryfall ID format')
    })
  })

  describe('readJson error handling', () => {
    it('listDecks skips corrupt deck files', () => {
      // Write a valid deck
      storage.saveDeck(makeDeck({ name: 'Good Deck' }))
      // Write a corrupt JSON file directly
      fs.writeFileSync(
        path.join(tmpDir, 'decks', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff.json'),
        'not valid json{{{',
        'utf-8'
      )
      const decks = storage.listDecks()
      expect(decks).toHaveLength(1)
      expect(decks[0].name).toBe('Good Deck')
    })

    it('getDeck throws on corrupt file', () => {
      const id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
      fs.writeFileSync(path.join(tmpDir, 'decks', `${id}.json`), '{bad json', 'utf-8')
      expect(() => storage.getDeck(id)).toThrow('Failed to read')
    })
  })

  describe('interest list', () => {
    it('returns default when no file exists', () => {
      const list = storage.getInterestList()
      expect(list.items).toEqual([])
      expect(list.version).toBe(1)
    })

    it('save and load round-trip', () => {
      const list: InterestList = {
        version: 1,
        updatedAt: '2024-01-01T00:00:00.000Z',
        items: [{
          id: 'item-1',
          card: { name: 'Sol Ring', setCode: 'c21', collectorNumber: '263' },
          addedAt: '2024-01-01T00:00:00.000Z',
        }],
      }
      storage.saveInterestList(list)
      const loaded = storage.getInterestList()
      expect(loaded.items).toHaveLength(1)
      expect(loaded.items[0].card.name).toBe('Sol Ring')
    })
  })

  describe('config', () => {
    it('returns defaults when no file exists', () => {
      const config = storage.getConfig()
      expect(config.theme).toBe('dark')
      expect(config.scryfallCacheExpiryDays).toBe(7)
    })

    it('save and load round-trip', () => {
      const config: Config = {
        scryfallCacheExpiryDays: 14,
        theme: 'light',
        imageCacheEnabled: false,
        imageCacheMaxSize: 100,
      }
      storage.saveConfig(config)
      const loaded = storage.getConfig()
      expect(loaded.theme).toBe('light')
      expect(loaded.scryfallCacheExpiryDays).toBe(14)
    })
  })

  describe('global roles', () => {
    it('returns defaults on fresh storage', () => {
      const roles = storage.getGlobalRoles()
      expect(roles.length).toBeGreaterThan(0)
    })

    it('save and load round-trip', () => {
      const roles = [{ id: 'custom', name: 'Custom Role' }]
      storage.saveGlobalRoles(roles)
      const loaded = storage.getGlobalRoles()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('custom')
    })
  })

  describe('scryfall cache', () => {
    const validId = '11111111-2222-3333-4444-555555555555'

    it('cacheCard and getCachedCard round-trip', () => {
      const cardData = { id: validId, name: 'Test Card' }
      storage.cacheCard(validId, cardData)
      const cached = storage.getCachedCard(validId) as { name: string }
      expect(cached.name).toBe('Test Card')
    })

    it('getCachedCard returns null for missing card', () => {
      expect(storage.getCachedCard(validId)).toBeNull()
    })
  })

  describe('cache stats', () => {
    it('returns zeros for empty cache', () => {
      const stats = storage.getCacheStats()
      expect(stats.jsonCacheCount).toBe(0)
      expect(stats.imageCacheCount).toBe(0)
      expect(stats.totalSizeBytes).toBe(0)
    })

    it('counts cached cards', () => {
      const id = '11111111-2222-3333-4444-555555555555'
      storage.cacheCard(id, { id, name: 'Card' })
      const stats = storage.getCacheStats()
      expect(stats.jsonCacheCount).toBe(1)
      expect(stats.jsonCacheSizeBytes).toBeGreaterThan(0)
    })
  })

  describe('clearCache', () => {
    it('clearJsonCache removes all JSON cache files', () => {
      const id = '11111111-2222-3333-4444-555555555555'
      storage.cacheCard(id, { id, name: 'Card' })
      expect(storage.getCacheStats().jsonCacheCount).toBe(1)
      storage.clearJsonCache()
      expect(storage.getCacheStats().jsonCacheCount).toBe(0)
    })
  })
})
