import fs from 'fs'
import path from 'path'
import os from 'os'
import type { Deck, DeckCard, Taxonomy, InterestList, Config, RoleDefinition, SetCollectionFile, PullListConfig, PulledPrinting, CacheIndex, CacheEntryMeta, CacheStats, ScryfallCard } from '../types/index.js'
import { DEFAULT_GLOBAL_ROLES } from '../constants/index.js'
import { DEFAULT_PULL_LIST_CONFIG, isDoubleFacedCard } from '../types/index.js'

// Global roles file schema
interface GlobalRolesFile {
  version: number
  roles: RoleDefinition[]
}

// Get the base storage directory
export function getStorageBasePath(): string {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'mtg-deckbuilder')
  } else if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), 'mtg-deckbuilder')
  } else {
    return path.join(os.homedir(), '.config', 'mtg-deckbuilder')
  }
}

export class Storage {
  private baseDir: string
  private decksDir: string
  private cacheDir: string
  private imageCacheDir: string
  private cacheIndexPath: string
  private globalRolesPath: string

  constructor(basePath?: string) {
    this.baseDir = basePath || getStorageBasePath()
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
      const defaultRoles: GlobalRolesFile = {
        version: 1,
        roles: DEFAULT_GLOBAL_ROLES
      }
      this.writeJson(this.globalRolesPath, defaultRoles)
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
  listDecks(): Deck[] {
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

  getDeck(id: string): Deck | null {
    const deck = this.readJson<Deck>(path.join(this.decksDir, `${id}.json`))
    if (deck && this.migrateLegacyPulledCards(deck)) {
      console.log(`Migrated legacy pulled cards in deck: ${deck.name}`)
      this.saveDeck(deck)
    }
    return deck
  }

  getDeckByName(name: string): Deck | null {
    // listDecks already runs migration
    const decks = this.listDecks()
    return decks.find(d => d.name.toLowerCase() === name.toLowerCase()) || null
  }

  saveDeck(deck: Deck): void {
    deck.version = (deck.version || 0) + 1
    deck.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.decksDir, `${deck.id}.json`), deck)
  }

  deleteDeck(id: string): boolean {
    const filePath = path.join(this.decksDir, `${id}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }

  // Taxonomy
  getTaxonomy(): Taxonomy {
    const taxonomy = this.readJson<Taxonomy>(path.join(this.baseDir, 'taxonomy.json'))
    if (taxonomy) return taxonomy

    // Return default taxonomy
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      globalRoles: DEFAULT_GLOBAL_ROLES
    }
  }

  saveTaxonomy(taxonomy: Taxonomy): void {
    taxonomy.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'taxonomy.json'), taxonomy)
  }

  // Interest List
  getInterestList(): InterestList {
    const list = this.readJson<InterestList>(path.join(this.baseDir, 'interest-list.json'))
    if (list) return list

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: []
    }
  }

  saveInterestList(list: InterestList): void {
    list.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'interest-list.json'), list)
  }

  // Config
  getConfig(): Config {
    const config = this.readJson<Config>(path.join(this.baseDir, 'config.json'))
    if (config) return config

    return {
      scryfallCacheExpiryDays: 7,
      theme: 'dark',
      imageCacheEnabled: true,
      imageCacheMaxSize: 500
    }
  }

  saveConfig(config: Config): void {
    this.writeJson(path.join(this.baseDir, 'config.json'), config)
  }

  // Global Roles
  getGlobalRoles(): RoleDefinition[] {
    const data = this.readJson<GlobalRolesFile>(this.globalRolesPath)
    if (data) return data.roles
    // Fallback to defaults if file is somehow missing
    return DEFAULT_GLOBAL_ROLES
  }

  saveGlobalRoles(roles: RoleDefinition[]): void {
    const data: GlobalRolesFile = {
      version: 1,
      roles
    }
    this.writeJson(this.globalRolesPath, data)
  }

  // Set Collection
  getSetCollection(): SetCollectionFile {
    const collection = this.readJson<SetCollectionFile>(path.join(this.baseDir, 'set-collection.json'))
    if (collection) return collection

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      sets: []
    }
  }

  saveSetCollection(collection: SetCollectionFile): void {
    collection.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'set-collection.json'), collection)
  }

  // Pull List Config
  getPullListConfig(): PullListConfig {
    const config = this.readJson<PullListConfig>(path.join(this.baseDir, 'pull-list-config.json'))
    if (config) return config

    return {
      ...DEFAULT_PULL_LIST_CONFIG,
      updatedAt: new Date().toISOString()
    }
  }

  savePullListConfig(config: PullListConfig): void {
    config.updatedAt = new Date().toISOString()
    this.writeJson(path.join(this.baseDir, 'pull-list-config.json'), config)
  }

  // Scryfall cache
  getCachedCard(scryfallId: string): unknown | null {
    const cachePath = path.join(this.cacheDir, `${scryfallId}.json`)
    return this.readJson(cachePath)
  }

  cacheCard(scryfallId: string, data: unknown): void {
    const cachePath = path.join(this.cacheDir, `${scryfallId}.json`)
    this.writeJson(cachePath, data)
  }

  // Paths
  getBasePath(): string {
    return this.baseDir
  }

  getDecksPath(): string {
    return this.decksDir
  }

  // Cache Index Methods
  getCacheIndex(): CacheIndex | null {
    return this.readJson<CacheIndex>(this.cacheIndexPath)
  }

  saveCacheIndex(index: CacheIndex): void {
    index.updatedAt = new Date().toISOString()
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

    return this.getCachedCard(scryfallId) as ScryfallCard | null
  }

  getCachedCardBySetCollector(setCode: string, collectorNumber: string): ScryfallCard | null {
    const index = this.getCacheIndex()
    if (!index) return null

    const key = `${setCode.toLowerCase()}|${collectorNumber}`
    const scryfallId = index.bySetCollector[key]
    if (!scryfallId) return null

    return this.getCachedCard(scryfallId) as ScryfallCard | null
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
        const card = this.getCachedCard(scryfallId) as ScryfallCard | null

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
}
