import fs from 'fs'
import path from 'path'
import type { Deck, CardIdentifier, ScryfallCard } from '@mtg-deckbuilder/shared'
import { Storage, isDoubleFacedCard, getAllDeckEntries } from '@mtg-deckbuilder/shared'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CacheLoadProgress {
  phase: 'calculating' | 'loading' | 'complete' | 'cancelled' | 'error'
  totalCards: number
  cachedCards: number
  currentCard?: string
  errors: string[]
}

// ── File Watching ──────────────────────────────────────────────────────────

export function watchForChanges(
  storage: Storage,
  callback: (event: string, filename: string | null) => void
): fs.FSWatcher {
  return fs.watch(storage.getBasePath(), { recursive: true }, (event, filename) => {
    callback(event, filename)
  })
}

// ── Collection Export / Import ─────────────────────────────────────────────

/**
 * Exports the full collection to a portable JSON structure.
 *
 * NOTE: `storage.getGlobalRoles()` returns `RoleDefinition[]`, not the raw
 * file shape `{ version, roles }`. To preserve the on-disk format we read
 * the file directly with `fs`. Every other section is available through the
 * public Storage API.
 */
export function exportCollection(storage: Storage): Record<string, unknown> {
  const config = storage.getConfig()
  const taxonomy = storage.getTaxonomy()
  const cardLists = storage.listCardLists()
  const setCollection = storage.getSetCollection()
  const pullListConfig = storage.getPullListConfig()
  const decks = storage.listDecks()

  // Read global-roles.json directly so we preserve the raw file shape
  // ({ version, roles }) rather than the unwrapped RoleDefinition[].
  const globalRolesPath = path.join(storage.getBasePath(), 'global-roles.json')
  let globalRoles: unknown = null
  try {
    if (fs.existsSync(globalRolesPath)) {
      globalRoles = JSON.parse(fs.readFileSync(globalRolesPath, 'utf-8'))
    }
  } catch {
    // If the file is missing or corrupt, omit it from the export.
  }

  const result: Record<string, unknown> = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    decks
  }

  if (config) result.config = config
  if (taxonomy) result.taxonomy = taxonomy
  if (globalRoles) result.globalRoles = globalRoles
  if (cardLists.length > 0) result.cardLists = cardLists
  if (setCollection) result.setCollection = setCollection
  if (pullListConfig) result.pullListConfig = pullListConfig

  return result
}

/**
 * Imports a previously-exported collection, replacing the current data on disk.
 *
 * Uses `fs` directly for writes so that we store the raw JSON as-is rather
 * than going through Storage methods that modify timestamps and versions.
 */
export function importCollection(
  storage: Storage,
  data: Record<string, unknown>
): { deckCount: number; warnings: string[] } {
  const warnings: string[] = []
  const baseDir = storage.getBasePath()
  const decksDir = storage.getDecksPath()

  // Validate format version
  if (!data.formatVersion || typeof data.formatVersion !== 'number') {
    throw new Error('Invalid backup file: missing formatVersion')
  }
  if (data.formatVersion > 1) {
    throw new Error(`Unsupported backup format version: ${data.formatVersion}. Please update the app.`)
  }

  // Validate decks is an array
  if (data.decks !== undefined && !Array.isArray(data.decks)) {
    throw new Error('Invalid backup file: decks must be an array')
  }

  // Delete all existing deck files
  try {
    const existingFiles = fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))
    for (const file of existingFiles) {
      fs.unlinkSync(path.join(decksDir, file))
    }
  } catch (error) {
    console.error('Error clearing existing decks:', error)
  }

  const writeJson = (filePath: string, value: unknown): void => {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8')
  }

  // Write each data section if present
  if (data.config) {
    writeJson(path.join(baseDir, 'config.json'), data.config)
  }
  if (data.taxonomy) {
    writeJson(path.join(baseDir, 'taxonomy.json'), data.taxonomy)
  }
  if (data.globalRoles) {
    writeJson(path.join(baseDir, 'global-roles.json'), data.globalRoles)
  }
  // New-format card lists: one file per list in lists/
  if (Array.isArray(data.cardLists)) {
    const listsDir = path.join(baseDir, 'lists')
    fs.mkdirSync(listsDir, { recursive: true })
    for (const list of data.cardLists as Array<{ id: string }>) {
      if (typeof list.id === 'string') {
        writeJson(path.join(listsDir, `${list.id}.json`), list)
      }
    }
  }
  // Legacy interest list: write as interest-list.json so the Storage
  // constructor picks it up and migrates it to the new location.
  if (data.interestList) {
    writeJson(path.join(baseDir, 'interest-list.json'), data.interestList)
  }
  if (data.setCollection) {
    writeJson(path.join(baseDir, 'set-collection.json'), data.setCollection)
  }
  if (data.pullListConfig) {
    writeJson(path.join(baseDir, 'pull-list-config.json'), data.pullListConfig)
  }

  // Write deck files
  let deckCount = 0
  const decks = (data.decks as Array<Record<string, unknown>>) || []
  for (const deck of decks) {
    if (!deck.id || typeof deck.id !== 'string') {
      warnings.push(`Skipped deck without valid id: ${deck.name || 'unnamed'}`)
      continue
    }
    writeJson(path.join(decksDir, `${deck.id}.json`), deck)
    deckCount++
  }

  return { deckCount, warnings }
}

// ── Pre-caching ────────────────────────────────────────────────────────────

export async function preCacheDeck(
  storage: Storage,
  deckId: string,
  includeImages: boolean
): Promise<{ success: boolean; cachedCards: number; cachedImages: number; errors: string[] }> {
  const deck = storage.getDeck(deckId)
  if (!deck) {
    return { success: false, cachedCards: 0, cachedImages: 0, errors: ['Deck not found'] }
  }

  const result = {
    success: true,
    cachedCards: 0,
    cachedImages: 0,
    errors: [] as string[]
  }

  // Collect all cards from the deck
  const allCards = getAllDeckEntries(deck)

  // Also include commanders
  const commanderIdentifiers = deck.commanders || []

  // Process regular deck cards
  for (const deckCard of allCards) {
    try {
      const card = await fetchAndCacheCard(storage, {
        scryfallId: deckCard.card.scryfallId,
        setCode: deckCard.card.setCode,
        collectorNumber: deckCard.card.collectorNumber,
        name: deckCard.card.name
      })

      if (card) {
        result.cachedCards++
        if (includeImages) {
          await cacheCardImages(storage, card)
          result.cachedImages++
        }
      } else {
        result.errors.push(`Card not found: ${deckCard.card.name}`)
      }

      // Rate limiting: wait 100ms between Scryfall API calls
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      result.errors.push(`Error caching ${deckCard.card.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Process commanders
  for (const commander of commanderIdentifiers) {
    try {
      const card = await fetchAndCacheCard(storage, commander)

      if (card) {
        result.cachedCards++
        if (includeImages) {
          await cacheCardImages(storage, card)
          result.cachedImages++
        }
      } else {
        result.errors.push(`Commander not found: ${commander.name}`)
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      result.errors.push(`Error caching commander ${commander.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (result.errors.length > 0) {
    result.success = false
  }

  return result
}

// ── Load All Cards to Cache ────────────────────────────────────────────────

let cacheLoadCancelled = false

export function cancelCacheLoad(): void {
  cacheLoadCancelled = true
}

export async function loadAllCardsToCache(
  storage: Storage,
  includeImages: boolean,
  onProgress: (progress: CacheLoadProgress) => void
): Promise<void> {
  cacheLoadCancelled = false
  const errors: string[] = []

  // Send initial calculating phase
  onProgress({
    phase: 'calculating',
    totalCards: 0,
    cachedCards: 0,
    errors: []
  })

  // Collect all unique cards from all decks
  const decks = storage.listDecks()
  const cardMap = new Map<string, { identifier: CardIdentifier; name: string }>()

  for (const deck of decks) {
    // Add commanders
    for (const commander of deck.commanders || []) {
      const key = commander.scryfallId || `${commander.setCode}|${commander.collectorNumber}` || commander.name.toLowerCase()
      if (!cardMap.has(key)) {
        cardMap.set(key, { identifier: commander, name: commander.name })
      }
    }

    // Add all deck cards
    const allCards = getAllDeckEntries(deck)
    for (const deckCard of allCards) {
      const card = deckCard.card
      const key = card.scryfallId || `${card.setCode}|${card.collectorNumber}` || card.name.toLowerCase()
      if (!cardMap.has(key)) {
        cardMap.set(key, { identifier: card, name: card.name })
      }
    }
  }

  // Filter out cards already in cache
  const cardsToFetch: Array<{ identifier: CardIdentifier; name: string }> = []

  for (const cardInfo of Array.from(cardMap.values())) {
    const { identifier } = cardInfo
    let isCached = false

    if (identifier.scryfallId) {
      isCached = storage.getCachedCard(identifier.scryfallId) !== null
    } else if (identifier.setCode && identifier.collectorNumber) {
      isCached = storage.getCachedCardBySetCollector(identifier.setCode, identifier.collectorNumber) !== null
    } else {
      isCached = storage.getCachedCardByName(identifier.name) !== null
    }

    if (!isCached) {
      cardsToFetch.push(cardInfo)
    }
  }

  const totalCards = cardsToFetch.length

  if (totalCards === 0) {
    onProgress({
      phase: 'complete',
      totalCards: 0,
      cachedCards: 0,
      errors: []
    })
    return
  }

  // Start loading
  let cachedCards = 0

  for (const cardInfo of cardsToFetch) {
    if (cacheLoadCancelled) {
      onProgress({
        phase: 'cancelled',
        totalCards,
        cachedCards,
        errors
      })
      return
    }

    const { identifier, name } = cardInfo

    onProgress({
      phase: 'loading',
      totalCards,
      cachedCards,
      currentCard: name,
      errors
    })

    try {
      const card = await fetchAndCacheCard(storage, identifier)

      if (card) {
        cachedCards++
        if (includeImages) {
          await cacheCardImages(storage, card)
        }
      } else {
        errors.push(`Card not found: ${name}`)
      }

      // Rate limiting: wait 100ms between Scryfall API calls
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      errors.push(`Error fetching ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  onProgress({
    phase: 'complete',
    totalCards,
    cachedCards,
    errors
  })
}

// ── Private Helpers ────────────────────────────────────────────────────────

/**
 * Attempt to look up a card in the local cache, falling back to the
 * Scryfall HTTP API when not cached. On successful fetch the card is
 * persisted via `storage.cacheCardWithIndex`.
 */
async function fetchAndCacheCard(
  storage: Storage,
  identifier: CardIdentifier
): Promise<ScryfallCard | null> {
  if (identifier.scryfallId) {
    const cached = storage.getCachedCard(identifier.scryfallId) as ScryfallCard | null
    if (cached) return cached

    const response = await fetch(`https://api.scryfall.com/cards/${identifier.scryfallId}`)
    if (response.ok) {
      const card = await response.json() as ScryfallCard
      storage.cacheCardWithIndex(card)
      return card
    }
  } else if (identifier.setCode && identifier.collectorNumber) {
    const cached = storage.getCachedCardBySetCollector(identifier.setCode, identifier.collectorNumber)
    if (cached) return cached

    const response = await fetch(`https://api.scryfall.com/cards/${identifier.setCode.toLowerCase()}/${identifier.collectorNumber}`)
    if (response.ok) {
      const card = await response.json() as ScryfallCard
      storage.cacheCardWithIndex(card)
      return card
    }
  } else {
    const cached = storage.getCachedCardByName(identifier.name)
    if (cached) return cached

    const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(identifier.name)}`)
    if (response.ok) {
      const card = await response.json() as ScryfallCard
      storage.cacheCardWithIndex(card)
      return card
    }
  }

  return null
}

/**
 * Download and cache card images (front and optionally back for DFCs).
 */
async function cacheCardImages(storage: Storage, card: ScryfallCard): Promise<void> {
  const isDFC = isDoubleFacedCard(card)

  const getImageUrl = (c: ScryfallCard, face: 0 | 1): string | null => {
    if (c.card_faces && c.card_faces[face]?.image_uris) {
      return c.card_faces[face].image_uris!.normal
    }
    if (face === 0 && c.image_uris) {
      return c.image_uris.normal
    }
    return null
  }

  if (isDFC && card.card_faces) {
    // Cache both faces
    const frontUrl = getImageUrl(card, 0)
    const backUrl = getImageUrl(card, 1)

    if (frontUrl && !storage.getCachedImagePath(card.id, 'front')) {
      try {
        const response = await fetch(frontUrl)
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          storage.cacheImage(card.id, buffer, 'front')
        }
      } catch (error) {
        console.error(`Error caching front image for ${card.name}:`, error)
      }
    }

    if (backUrl && !storage.getCachedImagePath(card.id, 'back')) {
      try {
        const response = await fetch(backUrl)
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          storage.cacheImage(card.id, buffer, 'back')
        }
      } catch (error) {
        console.error(`Error caching back image for ${card.name}:`, error)
      }
    }
  } else {
    // Single-faced card
    const imageUrl = getImageUrl(card, 0)

    if (imageUrl && !storage.getCachedImagePath(card.id)) {
      try {
        const response = await fetch(imageUrl)
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          storage.cacheImage(card.id, buffer)
        }
      } catch (error) {
        console.error(`Error caching image for ${card.name}:`, error)
      }
    }
  }
}
