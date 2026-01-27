import fs from 'fs'
import path from 'path'
import { app } from 'electron'

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
  private globalRolesPath: string
  private watcher: fs.FSWatcher | null = null

  constructor() {
    this.baseDir = path.join(app.getPath('appData'), 'mtg-deckbuilder')
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
