import fs from 'fs'
import path from 'path'
import os from 'os'
import type { Deck, Taxonomy, InterestList, Config, RoleDefinition, SetCollectionFile, PullListConfig } from '../types/index.js'
import { DEFAULT_GLOBAL_ROLES } from '../constants/index.js'
import { DEFAULT_PULL_LIST_CONFIG } from '../types/index.js'

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
  private globalRolesPath: string

  constructor(basePath?: string) {
    this.baseDir = basePath || getStorageBasePath()
    this.decksDir = path.join(this.baseDir, 'decks')
    this.cacheDir = path.join(this.baseDir, 'cache', 'scryfall')
    this.globalRolesPath = path.join(this.baseDir, 'global-roles.json')

    // Ensure directories exist
    this.ensureDir(this.baseDir)
    this.ensureDir(this.decksDir)
    this.ensureDir(this.cacheDir)

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

  // Decks
  listDecks(): Deck[] {
    try {
      const files = fs.readdirSync(this.decksDir).filter(f => f.endsWith('.json'))
      return files
        .map(f => this.readJson<Deck>(path.join(this.decksDir, f)))
        .filter((d): d is Deck => d !== null)
    } catch (error) {
      console.error('Error listing decks:', error)
      return []
    }
  }

  getDeck(id: string): Deck | null {
    return this.readJson<Deck>(path.join(this.decksDir, `${id}.json`))
  }

  getDeckByName(name: string): Deck | null {
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
}
