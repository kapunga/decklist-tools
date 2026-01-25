// Card Identifier
export interface CardIdentifier {
  scryfallId?: string
  name: string
  setCode: string
  collectorNumber: string
}

// Enums
export type InclusionStatus = 'confirmed' | 'considering' | 'cut'
export type OwnershipStatus = 'owned' | 'pulled' | 'need_to_buy'
export type CardRole = 'commander' | 'core' | 'enabler' | 'support' | 'flex' | 'land'
export type AddedBy = 'user' | 'import'
export type FormatType = 'commander' | 'standard' | 'modern' | 'kitchen_table'
export type TagCategory = 'function' | 'strategy' | 'theme' | 'mechanic' | 'meta'
export type InteractionCategory = 'combo' | 'synergy' | 'nonbo'

// Role importance scores
export const roleImportance: Record<CardRole, number> = {
  commander: 10,
  core: 9,
  land: 8,
  enabler: 7,
  support: 5,
  flex: 3
}

// Deck Format
export interface DeckFormat {
  type: FormatType
  deckSize: number
  sideboardSize: number
  cardLimit: number
  unlimitedCards: string[]
}

export const formatDefaults: Record<FormatType, DeckFormat> = {
  commander: {
    type: 'commander',
    deckSize: 100,
    sideboardSize: 0,
    cardLimit: 1,
    unlimitedCards: [
      'Relentless Rats', 'Rat Colony', 'Shadowborn Apostle',
      'Seven Dwarves', "Dragon's Approach", 'Persistent Petitioners',
      'Cid Timeless Artificer'
    ]
  },
  standard: {
    type: 'standard',
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
    unlimitedCards: []
  },
  modern: {
    type: 'modern',
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
    unlimitedCards: []
  },
  kitchen_table: {
    type: 'kitchen_table',
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: Infinity,
    unlimitedCards: []
  }
}

// Deck Card
export interface DeckCard {
  card: CardIdentifier
  quantity: number
  inclusion: InclusionStatus
  ownership: OwnershipStatus
  role: CardRole
  isPinned: boolean
  tags: string[]
  notes?: string
  addedAt: string
  addedBy: AddedBy
}

// Strategy types
export interface SynergyPackage {
  name: string
  description?: string
  cardNames: string[]
  priority: number
  tags: string[]
}

export interface CardInteraction {
  cards: string[]
  description: string
  category: InteractionCategory
}

export interface DeckRequirements {
  minLands: number
  maxLands: number
  neededEffects: string[]
}

export interface DeckStrategy {
  description: string
  packages: SynergyPackage[]
  interactions: CardInteraction[]
  requirements: DeckRequirements
}

// Custom Tags
export interface CustomTagDefinition {
  id: string
  name: string
  description?: string
  color?: string
}

// Deck Notes
export interface DeckNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

// Deck
export interface Deck {
  id: string
  name: string
  format: DeckFormat
  createdAt: string
  updatedAt: string
  version: number
  description?: string
  archetype?: string
  strategy?: DeckStrategy
  cards: DeckCard[]
  alternates: DeckCard[]
  sideboard: DeckCard[]
  customTags: CustomTagDefinition[]
  notes: DeckNote[]
}

// Taxonomy
export interface GlobalTag {
  id: string
  name: string
  category: TagCategory
  description: string
  aliases?: string[]
}

export interface Taxonomy {
  version: number
  updatedAt: string
  globalTags: GlobalTag[]
}

// Interest List
export interface InterestItem {
  id: string
  card: CardIdentifier
  notes?: string
  potentialDecks?: string[]
  addedAt: string
  source?: string
}

export interface InterestList {
  version: number
  updatedAt: string
  items: InterestItem[]
}

// Config
export interface Config {
  scryfallCacheExpiryDays: number
  theme: 'light' | 'dark'
  imageCacheEnabled: boolean
  imageCacheMaxSize: number
  defaultFormat?: FormatType
}

// Scryfall types
export interface ScryfallCard {
  id: string
  name: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  colors?: string[]
  color_identity: string[]
  set: string
  collector_number: string
  rarity: string
  image_uris?: {
    small: string
    normal: string
    large: string
    png?: string
  }
  card_faces?: Array<{
    name: string
    mana_cost?: string
    type_line?: string
    oracle_text?: string
    image_uris?: {
      small: string
      normal: string
      large: string
    }
  }>
  prices?: {
    usd?: string
    usd_foil?: string
  }
  legalities: Record<string, string>
}

// Helper functions
export function createEmptyDeck(name: string, formatType: FormatType): Deck {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    format: formatDefaults[formatType],
    createdAt: now,
    updatedAt: now,
    version: 1,
    cards: [],
    alternates: [],
    sideboard: [],
    customTags: [],
    notes: []
  }
}

export function getCardCount(deck: Deck): number {
  return deck.cards
    .filter(c => c.inclusion === 'confirmed')
    .reduce((sum, c) => sum + c.quantity, 0)
}

export function isBasicLand(name: string): boolean {
  const basicLands = [
    'Plains', 'Island', 'Swamp', 'Mountain', 'Forest',
    'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
    'Snow-Covered Mountain', 'Snow-Covered Forest', 'Wastes'
  ]
  return basicLands.includes(name)
}
