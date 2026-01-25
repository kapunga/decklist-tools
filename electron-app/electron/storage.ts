import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class Storage {
  private baseDir: string
  private decksDir: string
  private cacheDir: string
  private watcher: fs.FSWatcher | null = null

  constructor() {
    this.baseDir = path.join(app.getPath('appData'), 'mtg-deckbuilder')
    this.decksDir = path.join(this.baseDir, 'decks')
    this.cacheDir = path.join(this.baseDir, 'cache', 'scryfall')

    // Ensure directories exist
    this.ensureDir(this.baseDir)
    this.ensureDir(this.decksDir)
    this.ensureDir(this.cacheDir)
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
  listDecks(): unknown[] {
    try {
      const files = fs.readdirSync(this.decksDir).filter(f => f.endsWith('.json'))
      return files
        .map(f => this.readJson(path.join(this.decksDir, f)))
        .filter((d): d is unknown => d !== null)
    } catch (error) {
      console.error('Error listing decks:', error)
      return []
    }
  }

  getDeck(id: string): unknown | null {
    return this.readJson(path.join(this.decksDir, `${id}.json`))
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
}
