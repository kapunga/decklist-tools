import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Mock the electron module — Storage only uses app.getPath('appData')
let tempDir: string
vi.mock('electron', () => ({
  app: {
    getPath: () => tempDir
  }
}))

// Import after mock is set up
import { Storage } from './storage'

// Helpers
function writeJsonFile(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function readJsonFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

describe('Storage collection export/import', () => {
  let storage: Storage
  let baseDir: string
  let decksDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtg-test-'))
    baseDir = path.join(tempDir, 'mtg-deckbuilder')
    decksDir = path.join(baseDir, 'decks')
    storage = new Storage()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // ─── exportCollection ─────────────────────────────────────────

  describe('exportCollection', () => {
    it('exports with formatVersion and exportedAt', () => {
      const result = storage.exportCollection()
      expect(result.formatVersion).toBe(1)
      expect(result.exportedAt).toBeDefined()
      expect(typeof result.exportedAt).toBe('string')
    })

    it('includes decks array even when empty', () => {
      const result = storage.exportCollection()
      expect(result.decks).toEqual([])
    })

    it('exports config when present', () => {
      const config = { scryfallCacheExpiryDays: 14, theme: 'dark' }
      writeJsonFile(path.join(baseDir, 'config.json'), config)

      const result = storage.exportCollection()
      expect(result.config).toEqual(config)
    })

    it('exports taxonomy when present', () => {
      const taxonomy = { version: 1, updatedAt: '2024-01-01', globalTags: [] }
      writeJsonFile(path.join(baseDir, 'taxonomy.json'), taxonomy)

      const result = storage.exportCollection()
      expect(result.taxonomy).toEqual(taxonomy)
    })

    it('exports globalRoles as full file wrapper (not just roles array)', () => {
      // The constructor writes a default global-roles.json, so it should be present
      const result = storage.exportCollection()
      expect(result.globalRoles).toBeDefined()
      const roles = result.globalRoles as { version: number; roles: unknown[] }
      expect(roles.version).toBe(1)
      expect(Array.isArray(roles.roles)).toBe(true)
    })

    it('exports interestList when present', () => {
      const interestList = { version: 1, updatedAt: '2024-01-01', items: [{ name: 'Sol Ring' }] }
      writeJsonFile(path.join(baseDir, 'interest-list.json'), interestList)

      const result = storage.exportCollection()
      expect(result.interestList).toEqual(interestList)
    })

    it('exports setCollection when present', () => {
      const setCollection = { version: 1, updatedAt: '2024-01-01', sets: [{ setCode: 'MH3' }] }
      writeJsonFile(path.join(baseDir, 'set-collection.json'), setCollection)

      const result = storage.exportCollection()
      expect(result.setCollection).toEqual(setCollection)
    })

    it('exports pullListConfig when present', () => {
      const pullListConfig = { version: 1, updatedAt: '2024-01-01', sortColumns: ['name'] }
      writeJsonFile(path.join(baseDir, 'pull-list-config.json'), pullListConfig)

      const result = storage.exportCollection()
      expect(result.pullListConfig).toEqual(pullListConfig)
    })

    it('omits sections that have no file on disk', () => {
      // Only globalRoles exists (from constructor), others should be absent
      const result = storage.exportCollection()
      expect(result.config).toBeUndefined()
      expect(result.taxonomy).toBeUndefined()
      expect(result.interestList).toBeUndefined()
      expect(result.setCollection).toBeUndefined()
      expect(result.pullListConfig).toBeUndefined()
    })

    it('exports deck files', () => {
      const deck = { id: 'deck-1', name: 'Test Deck', cards: [], alternates: [], sideboard: [], version: 1 }
      writeJsonFile(path.join(decksDir, 'deck-1.json'), deck)

      const result = storage.exportCollection()
      const decks = result.decks as unknown[]
      expect(decks).toHaveLength(1)
      expect((decks[0] as Record<string, unknown>).name).toBe('Test Deck')
    })

    it('exports multiple decks', () => {
      writeJsonFile(path.join(decksDir, 'a.json'), {
        id: 'a', name: 'Deck A', cards: [], alternates: [], sideboard: [], version: 1
      })
      writeJsonFile(path.join(decksDir, 'b.json'), {
        id: 'b', name: 'Deck B', cards: [], alternates: [], sideboard: [], version: 1
      })

      const result = storage.exportCollection()
      expect((result.decks as unknown[]).length).toBe(2)
    })
  })

  // ─── importCollection ─────────────────────────────────────────

  describe('importCollection', () => {
    it('throws on missing formatVersion', () => {
      expect(() => storage.importCollection({ decks: [] }))
        .toThrow('missing formatVersion')
    })

    it('throws on non-numeric formatVersion', () => {
      expect(() => storage.importCollection({ formatVersion: '1' as unknown as number, decks: [] }))
        .toThrow('missing formatVersion')
    })

    it('throws on unsupported formatVersion', () => {
      expect(() => storage.importCollection({ formatVersion: 2, decks: [] }))
        .toThrow('Unsupported backup format version: 2')
    })

    it('throws when decks is not an array', () => {
      expect(() => storage.importCollection({ formatVersion: 1, decks: 'bad' as unknown }))
        .toThrow('decks must be an array')
    })

    it('accepts valid minimal backup', () => {
      const result = storage.importCollection({ formatVersion: 1, decks: [] })
      expect(result.deckCount).toBe(0)
      expect(result.warnings).toEqual([])
    })

    it('deletes existing deck files before importing', () => {
      // Create an existing deck
      writeJsonFile(path.join(decksDir, 'old-deck.json'), { id: 'old-deck', name: 'Old' })
      expect(fs.existsSync(path.join(decksDir, 'old-deck.json'))).toBe(true)

      storage.importCollection({ formatVersion: 1, decks: [] })

      expect(fs.existsSync(path.join(decksDir, 'old-deck.json'))).toBe(false)
    })

    it('writes imported deck files', () => {
      const deck = { id: 'new-deck', name: 'New Deck', cards: [] }
      const result = storage.importCollection({
        formatVersion: 1,
        decks: [deck]
      })

      expect(result.deckCount).toBe(1)
      const written = readJsonFile(path.join(decksDir, 'new-deck.json'))
      expect(written.name).toBe('New Deck')
    })

    it('writes multiple deck files', () => {
      const result = storage.importCollection({
        formatVersion: 1,
        decks: [
          { id: 'deck-a', name: 'A' },
          { id: 'deck-b', name: 'B' },
          { id: 'deck-c', name: 'C' }
        ]
      })

      expect(result.deckCount).toBe(3)
      expect(fs.existsSync(path.join(decksDir, 'deck-a.json'))).toBe(true)
      expect(fs.existsSync(path.join(decksDir, 'deck-b.json'))).toBe(true)
      expect(fs.existsSync(path.join(decksDir, 'deck-c.json'))).toBe(true)
    })

    it('warns and skips decks without valid id', () => {
      const result = storage.importCollection({
        formatVersion: 1,
        decks: [
          { name: 'No ID Deck' },
          { id: 123, name: 'Numeric ID' },
          { id: 'valid', name: 'Valid Deck' }
        ]
      })

      expect(result.deckCount).toBe(1)
      expect(result.warnings).toHaveLength(2)
      expect(result.warnings[0]).toContain('No ID Deck')
      expect(result.warnings[1]).toContain('Numeric ID')
    })

    it('warns with "unnamed" for decks without id or name', () => {
      const result = storage.importCollection({
        formatVersion: 1,
        decks: [{ someField: 'value' }]
      })

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('unnamed')
    })

    it('writes config.json when present in backup', () => {
      const config = { scryfallCacheExpiryDays: 30, theme: 'light' }
      storage.importCollection({ formatVersion: 1, config, decks: [] })

      const written = readJsonFile(path.join(baseDir, 'config.json'))
      expect(written.theme).toBe('light')
    })

    it('writes taxonomy.json when present in backup', () => {
      const taxonomy = { version: 1, globalTags: [{ id: 'test', name: 'Test' }] }
      storage.importCollection({ formatVersion: 1, taxonomy, decks: [] })

      const written = readJsonFile(path.join(baseDir, 'taxonomy.json'))
      expect(written.globalTags).toHaveLength(1)
    })

    it('writes global-roles.json when present in backup', () => {
      const globalRoles = { version: 1, roles: [{ id: 'ramp', name: 'Ramp' }] }
      storage.importCollection({ formatVersion: 1, globalRoles, decks: [] })

      const written = readJsonFile(path.join(baseDir, 'global-roles.json'))
      expect(written.roles).toHaveLength(1)
      expect(written.roles[0].id).toBe('ramp')
    })

    it('writes interest-list.json when present in backup', () => {
      const interestList = { version: 1, items: [{ name: 'Mana Crypt' }] }
      storage.importCollection({ formatVersion: 1, interestList, decks: [] })

      const written = readJsonFile(path.join(baseDir, 'interest-list.json'))
      expect(written.items[0].name).toBe('Mana Crypt')
    })

    it('writes set-collection.json when present in backup', () => {
      const setCollection = { version: 1, sets: [{ setCode: 'MH3', setName: 'Modern Horizons 3' }] }
      storage.importCollection({ formatVersion: 1, setCollection, decks: [] })

      const written = readJsonFile(path.join(baseDir, 'set-collection.json'))
      expect(written.sets[0].setCode).toBe('MH3')
    })

    it('writes pull-list-config.json when present in backup', () => {
      const pullListConfig = { version: 1, sortColumns: ['rarity', 'name'] }
      storage.importCollection({ formatVersion: 1, pullListConfig, decks: [] })

      const written = readJsonFile(path.join(baseDir, 'pull-list-config.json'))
      expect(written.sortColumns).toEqual(['rarity', 'name'])
    })

    it('skips missing optional sections gracefully', () => {
      // Only formatVersion and decks — no config, taxonomy, etc.
      const result = storage.importCollection({ formatVersion: 1, decks: [] })
      expect(result.deckCount).toBe(0)
      expect(result.warnings).toEqual([])
    })

    it('handles undefined decks gracefully', () => {
      const result = storage.importCollection({ formatVersion: 1 })
      expect(result.deckCount).toBe(0)
      expect(result.warnings).toEqual([])
    })
  })

  // ─── Round-trip ───────────────────────────────────────────────

  describe('export → import round-trip', () => {
    it('round-trips a full collection', () => {
      // Set up a populated collection
      writeJsonFile(path.join(baseDir, 'config.json'), { theme: 'dark' })
      writeJsonFile(path.join(baseDir, 'taxonomy.json'), { version: 1, globalTags: [] })
      writeJsonFile(path.join(baseDir, 'interest-list.json'), { version: 1, items: [] })
      writeJsonFile(path.join(baseDir, 'set-collection.json'), { version: 1, sets: [] })
      writeJsonFile(path.join(baseDir, 'pull-list-config.json'), { version: 1, sortColumns: [] })
      writeJsonFile(path.join(decksDir, 'abc.json'), {
        id: 'abc', name: 'My Commander Deck', cards: [], alternates: [], sideboard: [], version: 1
      })

      // Export
      const exported = storage.exportCollection()
      expect(exported.formatVersion).toBe(1)
      expect((exported.decks as unknown[]).length).toBe(1)

      // Wipe everything
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtg-test-'))
      baseDir = path.join(tempDir, 'mtg-deckbuilder')
      decksDir = path.join(baseDir, 'decks')
      storage = new Storage()

      // Import
      const result = storage.importCollection(exported)
      expect(result.deckCount).toBe(1)
      expect(result.warnings).toEqual([])

      // Verify the deck came back
      const deck = readJsonFile(path.join(decksDir, 'abc.json'))
      expect(deck.name).toBe('My Commander Deck')

      // Verify config came back
      const config = readJsonFile(path.join(baseDir, 'config.json'))
      expect(config.theme).toBe('dark')
    })

    it('replaces old data on import', () => {
      // Start with two decks
      writeJsonFile(path.join(decksDir, 'old-1.json'), {
        id: 'old-1', name: 'Old Deck 1', cards: [], alternates: [], sideboard: [], version: 1
      })
      writeJsonFile(path.join(decksDir, 'old-2.json'), {
        id: 'old-2', name: 'Old Deck 2', cards: [], alternates: [], sideboard: [], version: 1
      })

      // Import a backup with a single different deck
      storage.importCollection({
        formatVersion: 1,
        decks: [{ id: 'new-1', name: 'New Deck' }]
      })

      // Old decks should be gone
      expect(fs.existsSync(path.join(decksDir, 'old-1.json'))).toBe(false)
      expect(fs.existsSync(path.join(decksDir, 'old-2.json'))).toBe(false)

      // New deck should exist
      expect(fs.existsSync(path.join(decksDir, 'new-1.json'))).toBe(true)

      const files = fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))
      expect(files).toHaveLength(1)
    })
  })
})
