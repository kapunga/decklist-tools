import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { Deck, DeckCard, PulledPrinting, CacheIndex, CacheEntryMeta, CacheStats, ScryfallCard, CardIdentifier } from '@mtg-deckbuilder/shared'
import { isDoubleFacedCard } from '@mtg-deckbuilder/shared'

export interface CacheLoadProgress {
  phase: 'calculating' | 'loading' | 'complete' | 'cancelled' | 'error'
  totalCards: number
  cachedCards: number
  currentCard?: string
  errors: string[]
}

// Global roles file schema
interface GlobalRolesFile {
  version: number
  roles: Array<{
    id: string
    name: string
    description?: string
    color?: string
  }>
}

// Default global roles - written on first run
const DEFAULT_GLOBAL_ROLES: GlobalRolesFile = {
  version: 1,
  roles: [
    // Special roles
    { id: 'commander', name: 'Commander', description: 'Deck commander', color: '#eab308' },
    { id: 'engine', name: 'Engine', description: 'Essential to how the deck wins or functions', color: '#ec4899' },
    { id: 'theme', name: 'Theme', description: 'Fits the deck flavor or identity', color: '#a855f7' },

    // Core strategic roles
    { id: 'ramp', name: 'Ramp', description: 'Accelerates mana production', color: '#22c55e' },
    { id: 'card-draw', name: 'Card Draw', description: 'Draws additional cards', color: '#3b82f6' },
    { id: 'removal', name: 'Removal', description: 'Removes permanents from the battlefield', color: '#ef4444' },
    { id: 'board-wipe', name: 'Board Wipe', description: 'Mass removal of permanents', color: '#dc2626' },
    { id: 'tutor', name: 'Tutor', description: 'Searches library for specific cards', color: '#8b5cf6' },
    { id: 'protection', name: 'Protection', description: 'Protects permanents or players', color: '#f59e0b' },
    { id: 'recursion', name: 'Recursion', description: 'Returns cards from graveyard', color: '#10b981' },
    { id: 'finisher', name: 'Finisher', description: 'Wins the game or deals major damage', color: '#f97316' },
    { id: 'win-condition', name: 'Win Condition', description: 'Directly enables victory', color: '#eab308' },

    // Creature/combat roles
    { id: 'beater', name: 'Beater', description: 'Efficient creature for combat damage', color: '#84cc16' },
    { id: 'blocker', name: 'Blocker', description: 'Defensive creature', color: '#64748b' },
    { id: 'evasion', name: 'Evasion', description: 'Creature with evasive abilities', color: '#06b6d4' },
    { id: 'value-engine', name: 'Value Engine', description: 'Generates ongoing card advantage', color: '#a855f7' },
    { id: 'utility', name: 'Utility', description: 'Provides useful abilities', color: '#6366f1' },

    // Archetype-specific roles
    { id: 'token-producer', name: 'Token Producer', description: 'Creates creature tokens', color: '#14b8a6' },
    { id: 'sacrifice-fodder', name: 'Sacrifice Fodder', description: 'Meant to be sacrificed', color: '#71717a' },
    { id: 'sacrifice-outlet', name: 'Sacrifice Outlet', description: 'Lets you sacrifice creatures', color: '#525252' },
    { id: 'payoff', name: 'Payoff', description: 'Rewards deck strategy', color: '#f472b6' },
    { id: 'enabler', name: 'Enabler', description: 'Enables deck strategy', color: '#22d3ee' },
    { id: 'combo-piece', name: 'Combo Piece', description: 'Part of a game-winning combo', color: '#fbbf24' },

    // Mana
    { id: 'mana-fixer', name: 'Mana Fixer', description: 'Fixes mana colors', color: '#4ade80' },

    // Interaction
    { id: 'counterspell', name: 'Counterspell', description: 'Counters spells', color: '#60a5fa' },
    { id: 'discard', name: 'Discard', description: 'Forces opponents to discard', color: '#374151' }
  ]
}

export class Storage {
  private baseDir: string
  private decksDir: string
  private cacheDir: string
  private imageCacheDir: string
  private cacheIndexPath: string
  private globalRolesPath: string
  private watcher: fs.FSWatcher | null = null
  private cacheLoadCancelled: boolean = false

  constructor() {
    this.baseDir = path.join(app.getPath('appData'), 'mtg-deckbuilder')
    this.decksDir = path.join(this.baseDir, 'decks')
    this.cacheDir = path.join(this.baseDir, 'cache', 'scryfall')
    this.imageCacheDir = path.join(this.baseDir, 'cache', 'images')
    this.cacheIndexPath = path.join(this.cacheDir, 'index.json')
    this.globalRolesPath = path.join(this.baseDir, 'global-roles.json')

    // Ensure directories exist
    this.ensureDir(this.baseDir)
    this.ensureDir(this.decksDir)
    this.ensureDir(this.cacheDir)
    this.ensureDir(this.imageCacheDir)

    // Initialize global roles file if it doesn't exist
    this.ensureGlobalRolesFile()
  }

  private ensureGlobalRolesFile() {
    if (!fs.existsSync(this.globalRolesPath)) {
      this.writeJson(this.globalRolesPath, DEFAULT_GLOBAL_ROLES)
    }
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private readJson<T>(filePath: string): T | null {
    try {
      if (!fs.existsSync(filePath)) return null
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as T
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error)
      return null
    }
  }

  private writeJson(filePath: string, data: unknown): void {
    try {
      const content = JSON.stringify(data, null, 2)
      fs.writeFileSync(filePath, content, 'utf-8')
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error)
      throw error
    }
  }

  // Migrate legacy ownership: 'pulled' to use pulledPrintings
  private migrateLegacyPulledCards(deck: Deck): boolean {
    let migrated = false

    const migrateCards = (cards: DeckCard[]) => {
      for (const card of cards) {
        // Check for legacy 'pulled' value (cast to handle old data)
        if ((card.ownership as string) === 'pulled') {
          // Convert to 'owned' and add pulledPrintings entry
          card.ownership = 'owned'
          card.pulledPrintings = card.pulledPrintings ?? []

          // Add entry for the card's current printing if not already tracked
          const existingEntry = card.pulledPrintings.find(
            (p: PulledPrinting) => p.setCode.toLowerCase() === card.card.setCode.toLowerCase() &&
                 p.collectorNumber === card.card.collectorNumber
          )

          if (!existingEntry) {
            card.pulledPrintings.push({
              setCode: card.card.setCode,
              collectorNumber: card.card.collectorNumber,
              quantity: card.quantity
            })
          }

          migrated = true
        }
      }
    }

    migrateCards(deck.cards || [])
    migrateCards(deck.alternates || [])
    migrateCards(deck.sideboard || [])

    return migrated
  }

  // Decks
  listDecks(): unknown[] {
    try {
      const files = fs.readdirSync(this.decksDir).filter(f => f.endsWith('.json'))
      const decks = files
        .map(f => this.readJson<Deck>(path.join(this.decksDir, f)))
        .filter((d): d is Deck => d !== null)

      // Run migration for any decks with legacy ownership: 'pulled'
      for (const deck of decks) {
        if (this.migrateLegacyPulledCards(deck)) {
          console.log(`Migrated legacy pulled cards in deck: ${deck.name}`)
          this.saveDeck(deck)
        }
      }

      return decks
    } catch (error) {
      console.error('Error listing decks:', error)
      return []
    }
  }

  getDeck(id: string): unknown | null {
    const deck = this.readJson<Deck>(path.join(this.decksDir, `${id}.json`))
    if (deck && this.migrateLegacyPulledCards(deck)) {
      console.log(`Migrated legacy pulled cards in deck: ${deck.name}`)
      this.saveDeck(deck)
    }
    return deck
  }

  saveDeck(deck: unknown): void {
    const d = deck as { id: string; version?: number; updatedAt?: string }
    d.version = (d.version || 0) + 1
    d.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.decksDir, `${d.id}.json`), deck)
  }

  deleteDeck(id: string): void {
    const filePath = path.join(this.decksDir, `${id}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  // Taxonomy
  getTaxonomy(): unknown {
    const taxonomy = this.readJson(path.join(this.baseDir, 'taxonomy.json'))
    if (taxonomy) return taxonomy

    // Return default taxonomy
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      globalTags: [
        { id: 'removal', name: 'Removal', category: 'function', description: 'Removes permanents' },
        { id: 'removal-creature', name: 'Creature Removal', category: 'function', description: 'Removes creatures' },
        { id: 'removal-artifact', name: 'Artifact Removal', category: 'function', description: 'Removes artifacts' },
        { id: 'removal-enchantment', name: 'Enchantment Removal', category: 'function', description: 'Removes enchantments' },
        { id: 'board-wipe', name: 'Board Wipe', category: 'function', description: 'Mass removal' },
        { id: 'ramp', name: 'Ramp', category: 'function', description: 'Accelerates mana' },
        { id: 'draw', name: 'Card Draw', category: 'function', description: 'Draws cards' },
        { id: 'tutor', name: 'Tutor', category: 'function', description: 'Searches library' },
        { id: 'protection', name: 'Protection', category: 'function', description: 'Protects permanents' },
        { id: 'recursion', name: 'Recursion', category: 'function', description: 'Returns from graveyard' },
        { id: 'finisher', name: 'Finisher', category: 'function', description: 'Wins the game' },
        { id: 'tokens', name: 'Tokens', category: 'mechanic', description: 'Creates tokens' },
        { id: 'blink', name: 'Blink', category: 'mechanic', description: 'Exiles and returns' },
        { id: 'sacrifice', name: 'Sacrifice', category: 'mechanic', description: 'Sacrifices for value' },
        { id: 'aristocrats', name: 'Aristocrats', category: 'mechanic', description: 'Death triggers' },
        { id: 'lifegain', name: 'Lifegain', category: 'mechanic', description: 'Gains life' },
        { id: 'counters', name: 'Counters', category: 'mechanic', description: 'Uses counters' },
        { id: 'graveyard', name: 'Graveyard', category: 'mechanic', description: 'Graveyard synergy' },
        { id: 'theme', name: 'Theme', category: 'theme', description: 'Central to deck identity' },
        { id: 'buy', name: 'Buy', category: 'meta', description: 'Cards to purchase' }
      ]
    }
  }

  saveTaxonomy(taxonomy: unknown): void {
    const t = taxonomy as { updatedAt?: string }
    t.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'taxonomy.json'), taxonomy)
  }

  // Interest List
  getInterestList(): unknown {
    const list = this.readJson(path.join(this.baseDir, 'interest-list.json'))
    if (list) return list

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: []
    }
  }

  saveInterestList(list: unknown): void {
    const l = list as { updatedAt?: string }
    l.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'interest-list.json'), list)
  }

  // Config
  getConfig(): unknown {
    const config = this.readJson(path.join(this.baseDir, 'config.json'))
    if (config) return config

    return {
      scryfallCacheExpiryDays: 7,
      theme: 'dark',
      imageCacheEnabled: true,
      imageCacheMaxSize: 500
    }
  }

  saveConfig(config: unknown): void {
    this.writeJson(path.join(this.baseDir, 'config.json'), config)
  }

  // Global Roles
  getGlobalRoles(): unknown[] {
    const data = this.readJson<GlobalRolesFile>(this.globalRolesPath)
    if (data) return data.roles
    // Fallback to defaults if file is somehow missing
    return DEFAULT_GLOBAL_ROLES.roles
  }

  saveGlobalRoles(roles: unknown[]): void {
    const data: GlobalRolesFile = {
      version: 1,
      roles: roles as GlobalRolesFile['roles']
    }
    this.writeJson(this.globalRolesPath, data)
  }

  // Set Collection
  getSetCollection(): unknown {
    const collection = this.readJson(path.join(this.baseDir, 'set-collection.json'))
    if (collection) return collection

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      sets: []
    }
  }

  saveSetCollection(collection: unknown): void {
    const c = collection as { updatedAt?: string }
    c.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'set-collection.json'), collection)
  }

  // Pull List Config
  getPullListConfig(): unknown {
    const config = this.readJson(path.join(this.baseDir, 'pull-list-config.json'))
    if (config) return config

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      sortColumns: ['rarity', 'type', 'manaCost', 'name'],
      showPulledSection: true
    }
  }

  savePullListConfig(config: unknown): void {
    const c = config as { updatedAt?: string }
    c.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'pull-list-config.json'), config)
  }

  // File watching
  watchForChanges(callback: (event: string, filename: string | null) => void): void {
    if (this.watcher) {
      this.watcher.close()
    }

    this.watcher = fs.watch(this.baseDir, { recursive: true }, (event, filename) => {
      callback(event, filename)
    })
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  // Cache Index Methods
  getCacheIndex(): CacheIndex | null {
    return this.readJson<CacheIndex>(this.cacheIndexPath)
  }

  saveCacheIndex(index: CacheIndex): void {
    const i = index as { updatedAt?: string }
    i.updatedAt = new Date().toISOString()
    this.writeJson(this.cacheIndexPath, index)
  }

  private createEmptyCacheIndex(): CacheIndex {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      byName: {},
      bySetCollector: {},
      entries: {}
    }
  }

  getCachedCardByName(name: string): ScryfallCard | null {
    const index = this.getCacheIndex()
    if (!index) return null

    const scryfallId = index.byName[name.toLowerCase()]
    if (!scryfallId) return null

    return this.getCachedCard(scryfallId)
  }

  getCachedCardBySetCollector(setCode: string, collectorNumber: string): ScryfallCard | null {
    const index = this.getCacheIndex()
    if (!index) return null

    const key = `${setCode.toLowerCase()}|${collectorNumber}`
    const scryfallId = index.bySetCollector[key]
    if (!scryfallId) return null

    return this.getCachedCard(scryfallId)
  }

  getCachedCard(scryfallId: string): ScryfallCard | null {
    const cachePath = path.join(this.cacheDir, `${scryfallId}.json`)
    return this.readJson<ScryfallCard>(cachePath)
  }

  cacheCard(scryfallId: string, data: unknown): void {
    const cachePath = path.join(this.cacheDir, `${scryfallId}.json`)
    this.writeJson(cachePath, data)
  }

  cacheCardWithIndex(card: ScryfallCard): void {
    // Cache the card JSON
    this.cacheCard(card.id, card)

    // Update the index
    let index = this.getCacheIndex()
    if (!index) {
      index = this.createEmptyCacheIndex()
    }

    // Get JSON file size
    const cachePath = path.join(this.cacheDir, `${card.id}.json`)
    let jsonSize = 0
    try {
      const stats = fs.statSync(cachePath)
      jsonSize = stats.size
    } catch {
      // File might not exist yet
    }

    // Create entry metadata
    const entry: CacheEntryMeta = {
      scryfallId: card.id,
      name: card.name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      cachedAt: new Date().toISOString(),
      jsonSize,
      hasImage: this.hasImageCached(card.id),
      imageSize: this.getImageSize(card.id),
      imageFaces: isDoubleFacedCard(card) ? 2 : 1
    }

    // Update index entries
    index.byName[card.name.toLowerCase()] = card.id
    index.bySetCollector[`${card.set.toLowerCase()}|${card.collector_number}`] = card.id
    index.entries[card.id] = entry

    this.saveCacheIndex(index)
  }

  rebuildCacheIndex(): CacheIndex {
    const index = this.createEmptyCacheIndex()

    try {
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json') && f !== 'index.json')

      for (const file of files) {
        const scryfallId = file.replace('.json', '')
        const card = this.getCachedCard(scryfallId)

        if (card) {
          const cachePath = path.join(this.cacheDir, file)
          const stats = fs.statSync(cachePath)

          const entry: CacheEntryMeta = {
            scryfallId: card.id,
            name: card.name,
            setCode: card.set,
            collectorNumber: card.collector_number,
            cachedAt: stats.mtime.toISOString(),
            jsonSize: stats.size,
            hasImage: this.hasImageCached(card.id),
            imageSize: this.getImageSize(card.id),
            imageFaces: isDoubleFacedCard(card) ? 2 : 1
          }

          index.byName[card.name.toLowerCase()] = card.id
          index.bySetCollector[`${card.set.toLowerCase()}|${card.collector_number}`] = card.id
          index.entries[card.id] = entry
        }
      }
    } catch (error) {
      console.error('Error rebuilding cache index:', error)
    }

    this.saveCacheIndex(index)
    return index
  }

  getCacheStats(): CacheStats {
    let jsonCacheCount = 0
    let jsonCacheSizeBytes = 0
    let imageCacheCount = 0
    let imageCacheSizeBytes = 0
    let oldestEntry: string | undefined
    let newestEntry: string | undefined

    // Count JSON cache files
    try {
      const jsonFiles = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json') && f !== 'index.json')
      jsonCacheCount = jsonFiles.length

      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file)
        const stats = fs.statSync(filePath)
        jsonCacheSizeBytes += stats.size

        const mtime = stats.mtime.toISOString()
        if (!oldestEntry || mtime < oldestEntry) oldestEntry = mtime
        if (!newestEntry || mtime > newestEntry) newestEntry = mtime
      }
    } catch {
      // Directory might not exist
    }

    // Count image cache files
    try {
      const imageFiles = fs.readdirSync(this.imageCacheDir).filter(f => f.endsWith('.jpg'))
      imageCacheCount = imageFiles.length

      for (const file of imageFiles) {
        const filePath = path.join(this.imageCacheDir, file)
        const stats = fs.statSync(filePath)
        imageCacheSizeBytes += stats.size
      }
    } catch {
      // Directory might not exist
    }

    return {
      jsonCacheCount,
      jsonCacheSizeBytes,
      imageCacheCount,
      imageCacheSizeBytes,
      totalSizeBytes: jsonCacheSizeBytes + imageCacheSizeBytes,
      oldestEntry,
      newestEntry
    }
  }

  clearJsonCache(): void {
    try {
      const files = fs.readdirSync(this.cacheDir)
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file))
      }
    } catch (error) {
      console.error('Error clearing JSON cache:', error)
    }
  }

  clearImageCache(): void {
    try {
      const files = fs.readdirSync(this.imageCacheDir)
      for (const file of files) {
        fs.unlinkSync(path.join(this.imageCacheDir, file))
      }
    } catch (error) {
      console.error('Error clearing image cache:', error)
    }
  }

  clearAllCache(): void {
    this.clearJsonCache()
    this.clearImageCache()
  }

  // Image Cache Methods
  getImageCacheDir(): string {
    return this.imageCacheDir
  }

  getCachedImagePath(scryfallId: string, face?: 'front' | 'back'): string | null {
    let filename: string
    if (face === 'back') {
      filename = `${scryfallId}_back.jpg`
    } else if (face === 'front') {
      filename = `${scryfallId}_front.jpg`
    } else {
      filename = `${scryfallId}.jpg`
    }

    const imagePath = path.join(this.imageCacheDir, filename)
    if (fs.existsSync(imagePath)) {
      return imagePath
    }

    // For single-faced cards, also check without suffix
    if (!face) {
      const frontPath = path.join(this.imageCacheDir, `${scryfallId}_front.jpg`)
      if (fs.existsSync(frontPath)) {
        return frontPath
      }
    }

    return null
  }

  cacheImage(scryfallId: string, data: Buffer, face?: 'front' | 'back'): void {
    let filename: string
    if (face === 'back') {
      filename = `${scryfallId}_back.jpg`
    } else if (face === 'front') {
      filename = `${scryfallId}_front.jpg`
    } else {
      filename = `${scryfallId}.jpg`
    }

    const imagePath = path.join(this.imageCacheDir, filename)
    fs.writeFileSync(imagePath, data)

    // Update cache index if it exists
    const index = this.getCacheIndex()
    if (index && index.entries[scryfallId]) {
      index.entries[scryfallId].hasImage = true
      index.entries[scryfallId].imageSize = this.getImageSize(scryfallId)
      this.saveCacheIndex(index)
    }
  }

  hasImageCached(scryfallId: string): boolean {
    return this.getCachedImagePath(scryfallId) !== null ||
           this.getCachedImagePath(scryfallId, 'front') !== null
  }

  private getImageSize(scryfallId: string): number | undefined {
    let totalSize = 0

    // Check for single image
    const singlePath = path.join(this.imageCacheDir, `${scryfallId}.jpg`)
    if (fs.existsSync(singlePath)) {
      totalSize += fs.statSync(singlePath).size
    }

    // Check for front face
    const frontPath = path.join(this.imageCacheDir, `${scryfallId}_front.jpg`)
    if (fs.existsSync(frontPath)) {
      totalSize += fs.statSync(frontPath).size
    }

    // Check for back face
    const backPath = path.join(this.imageCacheDir, `${scryfallId}_back.jpg`)
    if (fs.existsSync(backPath)) {
      totalSize += fs.statSync(backPath).size
    }

    return totalSize > 0 ? totalSize : undefined
  }

  // Pre-cache deck cards and images
  async preCacheDeck(deckId: string, includeImages: boolean): Promise<{ success: boolean; cachedCards: number; cachedImages: number; errors: string[] }> {
    const deck = this.getDeck(deckId) as Deck | null
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
    const allCards = [
      ...deck.cards,
      ...deck.alternates,
      ...deck.sideboard
    ]

    // Also include commanders
    const commanderIdentifiers = deck.commanders || []

    // Process regular deck cards
    for (const deckCard of allCards) {
      try {
        let card: ScryfallCard | null = null

        if (deckCard.card.scryfallId) {
          card = this.getCachedCard(deckCard.card.scryfallId)
          if (!card) {
            // Fetch from Scryfall API
            const response = await fetch(`https://api.scryfall.com/cards/${deckCard.card.scryfallId}`)
            if (response.ok) {
              card = await response.json() as ScryfallCard
              this.cacheCardWithIndex(card)
            }
          }
        } else if (deckCard.card.setCode && deckCard.card.collectorNumber) {
          card = this.getCachedCardBySetCollector(deckCard.card.setCode, deckCard.card.collectorNumber)
          if (!card) {
            const response = await fetch(`https://api.scryfall.com/cards/${deckCard.card.setCode.toLowerCase()}/${deckCard.card.collectorNumber}`)
            if (response.ok) {
              card = await response.json() as ScryfallCard
              this.cacheCardWithIndex(card)
            }
          }
        } else {
          card = this.getCachedCardByName(deckCard.card.name)
          if (!card) {
            const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(deckCard.card.name)}`)
            if (response.ok) {
              card = await response.json() as ScryfallCard
              this.cacheCardWithIndex(card)
            }
          }
        }

        if (card) {
          result.cachedCards++

          if (includeImages) {
            await this.cacheCardImages(card)
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
        let card: ScryfallCard | null = null

        if (commander.scryfallId) {
          card = this.getCachedCard(commander.scryfallId)
          if (!card) {
            const response = await fetch(`https://api.scryfall.com/cards/${commander.scryfallId}`)
            if (response.ok) {
              card = await response.json() as ScryfallCard
              this.cacheCardWithIndex(card)
            }
          }
        } else if (commander.setCode && commander.collectorNumber) {
          card = this.getCachedCardBySetCollector(commander.setCode, commander.collectorNumber)
          if (!card) {
            const response = await fetch(`https://api.scryfall.com/cards/${commander.setCode.toLowerCase()}/${commander.collectorNumber}`)
            if (response.ok) {
              card = await response.json() as ScryfallCard
              this.cacheCardWithIndex(card)
            }
          }
        } else {
          card = this.getCachedCardByName(commander.name)
          if (!card) {
            const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(commander.name)}`)
            if (response.ok) {
              card = await response.json() as ScryfallCard
              this.cacheCardWithIndex(card)
            }
          }
        }

        if (card) {
          result.cachedCards++

          if (includeImages) {
            await this.cacheCardImages(card)
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

  private async cacheCardImages(card: ScryfallCard): Promise<void> {
    const isDFC = isDoubleFacedCard(card)

    const getImageUrl = (card: ScryfallCard, face: 0 | 1): string | null => {
      if (card.card_faces && card.card_faces[face]?.image_uris) {
        return card.card_faces[face].image_uris!.normal
      }
      if (face === 0 && card.image_uris) {
        return card.image_uris.normal
      }
      return null
    }

    if (isDFC && card.card_faces) {
      // Cache both faces
      const frontUrl = getImageUrl(card, 0)
      const backUrl = getImageUrl(card, 1)

      if (frontUrl && !this.getCachedImagePath(card.id, 'front')) {
        try {
          const response = await fetch(frontUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            this.cacheImage(card.id, buffer, 'front')
          }
        } catch (error) {
          console.error(`Error caching front image for ${card.name}:`, error)
        }
      }

      if (backUrl && !this.getCachedImagePath(card.id, 'back')) {
        try {
          const response = await fetch(backUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            this.cacheImage(card.id, buffer, 'back')
          }
        } catch (error) {
          console.error(`Error caching back image for ${card.name}:`, error)
        }
      }
    } else {
      // Single-faced card
      const imageUrl = getImageUrl(card, 0)

      if (imageUrl && !this.getCachedImagePath(card.id)) {
        try {
          const response = await fetch(imageUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            this.cacheImage(card.id, buffer)
          }
        } catch (error) {
          console.error(`Error caching image for ${card.name}:`, error)
        }
      }
    }
  }

  cancelCacheLoad(): void {
    this.cacheLoadCancelled = true
  }

  async loadAllCardsToCache(
    includeImages: boolean,
    onProgress: (progress: CacheLoadProgress) => void
  ): Promise<void> {
    this.cacheLoadCancelled = false
    const errors: string[] = []

    // Send initial calculating phase
    onProgress({
      phase: 'calculating',
      totalCards: 0,
      cachedCards: 0,
      errors: []
    })

    // Collect all unique cards from all decks
    const decks = this.listDecks() as Deck[]
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
      const allCards = [...deck.cards, ...deck.alternates, ...deck.sideboard]
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

    for (const [, cardInfo] of cardMap) {
      const { identifier } = cardInfo
      let isCached = false

      if (identifier.scryfallId) {
        isCached = this.getCachedCard(identifier.scryfallId) !== null
      } else if (identifier.setCode && identifier.collectorNumber) {
        isCached = this.getCachedCardBySetCollector(identifier.setCode, identifier.collectorNumber) !== null
      } else {
        isCached = this.getCachedCardByName(identifier.name) !== null
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
      if (this.cacheLoadCancelled) {
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
        let card: ScryfallCard | null = null

        if (identifier.scryfallId) {
          const response = await fetch(`https://api.scryfall.com/cards/${identifier.scryfallId}`)
          if (response.ok) {
            card = await response.json() as ScryfallCard
          }
        } else if (identifier.setCode && identifier.collectorNumber) {
          const response = await fetch(`https://api.scryfall.com/cards/${identifier.setCode.toLowerCase()}/${identifier.collectorNumber}`)
          if (response.ok) {
            card = await response.json() as ScryfallCard
          }
        } else {
          const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`)
          if (response.ok) {
            card = await response.json() as ScryfallCard
          }
        }

        if (card) {
          this.cacheCardWithIndex(card)
          cachedCards++

          if (includeImages) {
            await this.cacheCardImages(card)
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
}
