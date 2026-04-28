import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Storage, INTEREST_LIST_ID, CARD_SET } from '@mtg-deckbuilder/shared'
import { exportCollection, importCollection } from './storage-extensions'

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
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtg-test-'))
    baseDir = path.join(tempDir, 'mtg-deckbuilder')
    decksDir = path.join(baseDir, 'decks')
    storage = new Storage(baseDir)
  })

  afterEach(() => {
    // Clean up temp directory
    const parentDir = path.dirname(baseDir)
    fs.rmSync(parentDir, { recursive: true, force: true })
  })

  // ─── exportCollection ─────────────────────────────────────────

  describe('exportCollection', () => {
    it('exports with formatVersion and exportedAt', () => {
      const result = exportCollection(storage)
      expect(result.formatVersion).toBe(1)
      expect(result.exportedAt).toBeDefined()
      expect(typeof result.exportedAt).toBe('string')
    })

    it('includes decks array even when empty', () => {
      const result = exportCollection(storage)
      expect(result.decks).toEqual([])
    })

    it('exports config when present', () => {
      const config = { scryfallCacheExpiryDays: 14, theme: 'gothic' }
      writeJsonFile(path.join(baseDir, 'config.json'), config)

      const result = exportCollection(storage)
      expect(result.config).toEqual(config)
    })

    it('exports taxonomy when present', () => {
      const taxonomy = { version: 1, updatedAt: '2024-01-01', globalTags: [] }
      writeJsonFile(path.join(baseDir, 'taxonomy.json'), taxonomy)

      const result = exportCollection(storage)
      expect(result.taxonomy).toEqual(taxonomy)
    })

    it('exports globalRoles as full file wrapper (not just roles array)', () => {
      // The constructor writes a default global-roles.json, so it should be present
      const result = exportCollection(storage)
      expect(result.globalRoles).toBeDefined()
      const roles = result.globalRoles as { version: number; roles: unknown[] }
      expect(roles.version).toBe(1)
      expect(Array.isArray(roles.roles)).toBe(true)
    })

    it('exports cardLists (including the interest list) when present', () => {
      const interestList = {
        id: INTEREST_LIST_ID,
        name: 'Interest List',
        version: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        cardSets: [{ name: CARD_SET.MAINBOARD, entries: [] }],
      }
      const listsDir = path.join(baseDir, 'lists')
      fs.mkdirSync(listsDir, { recursive: true })
      writeJsonFile(path.join(listsDir, `${INTEREST_LIST_ID}.json`), interestList)

      const result = exportCollection(storage)
      const cardLists = result.cardLists as Array<{ id: string }>
      expect(Array.isArray(cardLists)).toBe(true)
      expect(cardLists).toHaveLength(1)
      expect(cardLists[0]).toEqual(interestList)
    })

    it('exports setCollection when present', () => {
      const setCollection = { version: 1, updatedAt: '2024-01-01', sets: [{ setCode: 'MH3' }] }
      writeJsonFile(path.join(baseDir, 'set-collection.json'), setCollection)

      const result = exportCollection(storage)
      expect(result.setCollection).toEqual(setCollection)
    })

    it('exports pullListConfig when present', () => {
      const pullListConfig = { version: 1, updatedAt: '2024-01-01', sortColumns: ['name'] }
      writeJsonFile(path.join(baseDir, 'pull-list-config.json'), pullListConfig)

      const result = exportCollection(storage)
      expect(result.pullListConfig).toEqual(pullListConfig)
    })

    it('exports deck files', () => {
      const deck = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Test Deck', cards: [], alternates: [], sideboard: [], commanders: [], version: 1 }
      writeJsonFile(path.join(decksDir, `${deck.id}.json`), deck)

      const result = exportCollection(storage)
      const decks = result.decks as unknown[]
      expect(decks).toHaveLength(1)
      expect((decks[0] as Record<string, unknown>).name).toBe('Test Deck')
    })

    it('exports multiple decks', () => {
      writeJsonFile(path.join(decksDir, 'aaaaaaaa-bbbb-cccc-dddd-111111111111.json'), {
        id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111', name: 'Deck A', cards: [], alternates: [], sideboard: [], commanders: [], version: 1
      })
      writeJsonFile(path.join(decksDir, 'aaaaaaaa-bbbb-cccc-dddd-222222222222.json'), {
        id: 'aaaaaaaa-bbbb-cccc-dddd-222222222222', name: 'Deck B', cards: [], alternates: [], sideboard: [], commanders: [], version: 1
      })
      const result = exportCollection(storage)
      expect((result.decks as unknown[]).length).toBe(2)
    })
  })

  // ─── importCollection ───────────────────────────────────────

  describe('importCollection', () => {
    it('throws on missing formatVersion', () => {
      expect(() => importCollection(storage, {})).toThrow('missing formatVersion')
    })

    it('throws on non-numeric formatVersion', () => {
      expect(() => importCollection(storage, { formatVersion: 'bad' } as any)).toThrow('missing formatVersion')
    })

    it('throws on unsupported formatVersion', () => {
      expect(() => importCollection(storage, { formatVersion: 999 })).toThrow('Unsupported')
    })

    it('throws when decks is not an array', () => {
      expect(() => importCollection(storage, { formatVersion: 1, decks: 'nope' })).toThrow('must be an array')
    })

    it('accepts valid minimal backup', () => {
      const result = importCollection(storage, { formatVersion: 1, decks: [] })
      expect(result.deckCount).toBe(0)
      expect(result.warnings).toEqual([])
    })

    it('deletes existing deck files before importing', () => {
      writeJsonFile(path.join(decksDir, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.json'), { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Old' })
      importCollection(storage, { formatVersion: 1, decks: [] })
      expect(fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))).toHaveLength(0)
    })

    it('writes imported deck files', () => {
      importCollection(storage, {
        formatVersion: 1,
        decks: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Imported Deck' }]
      })
      const files = fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))
      expect(files).toHaveLength(1)
      expect(readJsonFile(path.join(decksDir, files[0])).name).toBe('Imported Deck')
    })

    it('writes multiple deck files', () => {
      importCollection(storage, {
        formatVersion: 1,
        decks: [
          { id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111', name: 'A' },
          { id: 'aaaaaaaa-bbbb-cccc-dddd-222222222222', name: 'B' },
        ]
      })
      expect(fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))).toHaveLength(2)
    })

    it('warns and skips decks without valid id', () => {
      const result = importCollection(storage, {
        formatVersion: 1,
        decks: [{ name: 'No ID' }]
      })
      expect(result.deckCount).toBe(0)
      expect(result.warnings).toHaveLength(1)
    })

    it('warns with "unnamed" for decks without id or name', () => {
      const result = importCollection(storage, {
        formatVersion: 1,
        decks: [{}]
      })
      expect(result.warnings[0]).toContain('unnamed')
    })

    it('writes config.json when present in backup', () => {
      importCollection(storage, { formatVersion: 1, decks: [], config: { theme: 'light' } })
      expect(readJsonFile(path.join(baseDir, 'config.json'))).toEqual({ theme: 'light' })
    })

    it('writes taxonomy.json when present in backup', () => {
      importCollection(storage, { formatVersion: 1, decks: [], taxonomy: { version: 1 } })
      expect(readJsonFile(path.join(baseDir, 'taxonomy.json'))).toEqual({ version: 1 })
    })

    it('writes global-roles.json when present in backup', () => {
      importCollection(storage, { formatVersion: 1, decks: [], globalRoles: { version: 1, roles: [] } })
      expect(readJsonFile(path.join(baseDir, 'global-roles.json'))).toEqual({ version: 1, roles: [] })
    })

    it('writes interest-list.json when present in backup', () => {
      importCollection(storage, { formatVersion: 1, decks: [], interestList: { items: [] } })
      expect(readJsonFile(path.join(baseDir, 'interest-list.json'))).toEqual({ items: [] })
    })
  })

  // ─── export → import round-trip ─────────────────────────────

  describe('export → import round-trip', () => {
    it('round-trips a full collection', () => {
      writeJsonFile(path.join(decksDir, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.json'), {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Round Trip Deck', cards: [], alternates: [], sideboard: [], commanders: [], version: 1
      })
      writeJsonFile(path.join(baseDir, 'config.json'), { theme: 'gothic' })

      const exported = exportCollection(storage)

      // Clear everything
      for (const f of fs.readdirSync(decksDir)) fs.unlinkSync(path.join(decksDir, f))

      const result = importCollection(storage, exported)
      expect(result.deckCount).toBe(1)
      expect(readJsonFile(path.join(baseDir, 'config.json'))).toEqual({ theme: 'gothic' })
    })
  })
})

describe('Storage art-crop cache', () => {
  // Real Scryfall ids (real UUIDs) so validateUUID accepts them.
  const sephirothId = '85eaf5e7-77dc-4842-a70c-ce4ac7f724df'
  const adrixNevId = '6adadbc9-4a08-4c1d-adf7-edee73799d9e'

  let storage: Storage
  let baseDir: string
  let artCropDir: string

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtg-test-'))
    baseDir = path.join(tempDir, 'mtg-deckbuilder')
    artCropDir = path.join(baseDir, 'cache', 'images', 'art-crops')
    storage = new Storage(baseDir)
  })

  afterEach(() => {
    const parentDir = path.dirname(baseDir)
    fs.rmSync(parentDir, { recursive: true, force: true })
  })

  it('returns null when no art crop is cached', () => {
    expect(storage.getCachedArtCropPath(sephirothId)).toBeNull()
    expect(storage.getCachedArtCropPath(sephirothId, 'back')).toBeNull()
  })

  it('round-trips cached front art crop', () => {
    const fakeJpeg = Buffer.from('fake jpeg bytes')
    storage.cacheArtCrop(sephirothId, fakeJpeg)
    const cachedPath = storage.getCachedArtCropPath(sephirothId)
    expect(cachedPath).not.toBeNull()
    expect(fs.readFileSync(cachedPath!)).toEqual(fakeJpeg)
  })

  it('stores front and back as distinct files', () => {
    const front = Buffer.from('front art')
    const back = Buffer.from('back art')
    storage.cacheArtCrop(adrixNevId, front, 'front')
    storage.cacheArtCrop(adrixNevId, back, 'back')

    const frontPath = storage.getCachedArtCropPath(adrixNevId, 'front')!
    const backPath = storage.getCachedArtCropPath(adrixNevId, 'back')!
    expect(frontPath).not.toBe(backPath)
    expect(fs.readFileSync(frontPath)).toEqual(front)
    expect(fs.readFileSync(backPath)).toEqual(back)
  })

  it('writes files into the art-crops subdirectory under cache/images', () => {
    storage.cacheArtCrop(sephirothId, Buffer.from('x'))
    const expectedPath = path.join(artCropDir, `${sephirothId}.jpg`)
    expect(fs.existsSync(expectedPath)).toBe(true)
  })
})
