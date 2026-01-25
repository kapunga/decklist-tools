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
export type BuiltInCardRole = 'commander' | 'core' | 'enabler' | 'support' | 'flex' | 'land'
export type CardRole = BuiltInCardRole | string // Allow custom roles
export type AddedBy = 'user' | 'import'
export type FormatType = 'commander' | 'standard' | 'modern' | 'kitchen_table'
export type TagCategory = 'function' | 'strategy' | 'theme' | 'mechanic' | 'meta'
export type InteractionCategory = 'combo' | 'synergy' | 'nonbo'

// Built-in roles constant for type checking
export const BUILT_IN_ROLES: BuiltInCardRole[] = ['commander', 'core', 'enabler', 'support', 'flex', 'land']

export function isBuiltInRole(role: string): role is BuiltInCardRole {
  return BUILT_IN_ROLES.includes(role as BuiltInCardRole)
}

// Role importance scores (built-in roles only, custom roles use sortOrder)
export const roleImportance: Record<BuiltInCardRole, number> = {
  commander: 10,
  core: 9,
  land: 8,
  enabler: 7,
  support: 5,
  flex: 3
}

// Get importance score for any role (built-in or custom)
// For custom roles, uses the customRoles array sortOrder or default of 1
export function getRoleImportance(role: CardRole, customRoles?: CustomRoleDefinition[]): number {
  if (isBuiltInRole(role)) {
    return roleImportance[role]
  }
  // For custom roles, look up in customRoles array
  const customRole = customRoles?.find(r => r.id === role)
  return customRole?.sortOrder ?? 1
}

// Custom Role Definition for user-defined roles
export interface CustomRoleDefinition {
  id: string           // e.g., "ramp", "card-draw"
  name: string         // e.g., "Ramp", "Card Draw"
  description?: string
  color?: string       // For UI display
  sortOrder: number    // Display priority (higher = more important)
}

// Deck Format
export interface DeckFormat {
  type: FormatType
  deckSize: number
  sideboardSize: number
  cardLimit: number
  unlimitedCards: string[]
  specialLimitCards?: Record<string, number> // Cards with specific limits (e.g., Seven Dwarves: 7)
}

export const formatDefaults: Record<FormatType, DeckFormat> = {
  commander: {
    type: 'commander',
    deckSize: 100,
    sideboardSize: 0,
    cardLimit: 1,
    unlimitedCards: [
      'Relentless Rats', 'Rat Colony', 'Shadowborn Apostle',
      "Dragon's Approach", 'Persistent Petitioners', 'Slime Against Humanity'
    ],
    specialLimitCards: {
      'Seven Dwarves': 7,
      'Nazgûl': 9
    }
  },
  standard: {
    type: 'standard',
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
    unlimitedCards: [],
    specialLimitCards: {
      'Seven Dwarves': 7
    }
  },
  modern: {
    type: 'modern',
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
    unlimitedCards: [],
    specialLimitCards: {
      'Seven Dwarves': 7,
      'Nazgûl': 9
    }
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
  id: string  // Unique identifier for this deck entry
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

// Generate a unique ID for deck cards
export function generateDeckCardId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
  // New fields
  artCardScryfallId?: string      // Scryfall ID for background art
  colorIdentity?: string[]        // Color identity (for commander, derived from commander card)
  customRoles: CustomRoleDefinition[] // User-defined roles beyond the 6 built-in
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
  layout?: string  // For detecting DFCs: 'transform', 'modal_dfc', 'reversible_card', etc.
  image_uris?: {
    small: string
    normal: string
    large: string
    png?: string
    art_crop?: string
    border_crop?: string
  }
  card_faces?: Array<{
    name: string
    mana_cost?: string
    type_line?: string
    oracle_text?: string
    colors?: string[]
    image_uris?: {
      small: string
      normal: string
      large: string
      art_crop?: string
      border_crop?: string
    }
  }>
  prices?: {
    usd?: string
    usd_foil?: string
    eur?: string
    eur_foil?: string
  }
  purchase_uris?: {
    tcgplayer?: string
    cardmarket?: string
    cardhoarder?: string
  }
  legalities: Record<string, string>
}

// Type guard for double-faced cards
export function isDoubleFacedCard(card: ScryfallCard): boolean {
  const dfcLayouts = ['transform', 'modal_dfc', 'reversible_card', 'double_faced_token']
  return dfcLayouts.includes(card.layout || '')
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
    notes: [],
    customRoles: []
  }
}

// Get card limit for a specific card in a format
export function getCardLimit(cardName: string, format: DeckFormat): number {
  // Check if basic land (always unlimited)
  if (isBasicLand(cardName)) return Infinity
  // Check if in unlimited cards list
  if (format.unlimitedCards.includes(cardName)) return Infinity
  // Check if has a special limit
  if (format.specialLimitCards?.[cardName] !== undefined) {
    return format.specialLimitCards[cardName]
  }
  // Return default card limit for format
  return format.cardLimit
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
