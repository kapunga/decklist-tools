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
export type AddedBy = 'user' | 'import'
export type FormatType = 'commander' | 'standard' | 'modern' | 'kitchen_table'
export type InteractionCategory = 'combo' | 'synergy' | 'nonbo'

// Role Definition - used for both global and deck-specific custom roles
export interface RoleDefinition {
  id: string           // e.g., "ramp", "card-draw"
  name: string         // e.g., "Ramp", "Card Draw"
  description?: string
  color?: string       // For UI display (hex color)
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

// Deck Card - cards can have multiple roles
export interface DeckCard {
  id: string  // Unique identifier for this deck entry
  card: CardIdentifier
  quantity: number
  inclusion: InclusionStatus
  ownership: OwnershipStatus
  roles: string[]  // List of role IDs
  typeLine?: string  // Card type line for grouping (e.g., "Creature — Human Wizard")
  isPinned: boolean
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
  commanders: CardIdentifier[]    // Commander(s) for Commander format
  customRoles: RoleDefinition[]   // Deck-specific custom roles
  notes: DeckNote[]
  artCardScryfallId?: string      // Scryfall ID for background art
  colorIdentity?: string[]        // Color identity (for commander, derived from commander card)
}

// Taxonomy - global role definitions shared across all decks
export interface Taxonomy {
  version: number
  updatedAt: string
  globalRoles: RoleDefinition[]
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
    commanders: [],
    customRoles: [],
    notes: []
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
  const mainDeckCount = deck.cards
    .filter(c => c.inclusion === 'confirmed')
    .reduce((sum, c) => sum + c.quantity, 0)

  // Commanders count towards deck size in Commander format
  const commanderCount = deck.commanders?.length || 0

  return mainDeckCount + commanderCount
}

export function isBasicLand(name: string): boolean {
  const basicLands = [
    'Plains', 'Island', 'Swamp', 'Mountain', 'Forest',
    'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
    'Snow-Covered Mountain', 'Snow-Covered Forest', 'Wastes'
  ]
  return basicLands.includes(name)
}
