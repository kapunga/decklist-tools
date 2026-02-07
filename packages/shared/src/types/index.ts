// Set Collection Types
export type CollectionLevel = 1 | 2 | 3 | 4

export interface SetCollectionEntry {
  setCode: string           // e.g., "mkm"
  setName: string           // e.g., "Murders at Karlov Manor"
  collectionLevel: CollectionLevel
  releasedAt?: string       // e.g., "2024-02-09"
  addedAt: string
}

export interface SetCollectionFile {
  version: number
  updatedAt: string
  sets: SetCollectionEntry[]
}

// Collection level descriptions for UI
export const COLLECTION_LEVEL_DESCRIPTIONS: Record<CollectionLevel, string> = {
  1: 'Few packs - commons and uncommons',
  2: 'Moderate - commons, uncommons, and rares',
  3: 'Good collection - all except mythics',
  4: 'Complete - all cards'
}

// Rarities included at each collection level for filter generation
export const COLLECTION_LEVEL_RARITIES: Record<CollectionLevel, string[]> = {
  1: ['common', 'uncommon'],
  2: ['common', 'uncommon', 'rare'],
  3: ['common', 'uncommon', 'rare', 'mythic'],
  4: ['common', 'uncommon', 'rare', 'mythic']  // All rarities, but no filter applied
}

// Card Identifier
export interface CardIdentifier {
  scryfallId?: string
  name: string
  setCode: string
  collectorNumber: string
}

// Enums
export type InclusionStatus = 'confirmed' | 'considering' | 'cut'
export type OwnershipStatus = 'unknown' | 'owned' | 'need_to_buy'
export type AddedBy = 'user' | 'import'
export type FormatType = 'commander' | 'standard' | 'modern' | 'kitchen_table'
export type NoteType = 'combo' | 'synergy' | 'theme' | 'strategy' | 'general'

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
      'Nazgul': 9
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
      'Nazgul': 9
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

// Pulled Printing - tracks which specific printings were pulled for a card
export interface PulledPrinting {
  setCode: string
  collectorNumber: string
  quantity: number
}

// Deck Card - cards can have multiple roles
export interface DeckCard {
  id: string  // Unique identifier for this deck entry
  card: CardIdentifier
  quantity: number
  inclusion: InclusionStatus
  ownership: OwnershipStatus
  roles: string[]  // List of role IDs
  typeLine?: string  // Card type line for grouping (e.g., "Creature - Human Wizard")
  isPinned: boolean
  notes?: string
  addedAt: string
  addedBy: AddedBy
  pulledPrintings?: PulledPrinting[]  // Which printings were pulled and how many
}

// Helper to get total pulled quantity across all printings
export function getTotalPulledQuantity(card: DeckCard): number {
  return (card.pulledPrintings ?? []).reduce((sum, p) => sum + p.quantity, 0)
}

// Check if a card is fully pulled based on pulledPrintings
export function isCardFullyPulled(card: DeckCard): boolean {
  return getTotalPulledQuantity(card) >= card.quantity
}

// Migrate a deck's cards from legacy ownership: 'pulled' to use pulledPrintings
// Returns true if any migrations were performed
export function migrateLegacyPulledCards(deck: Deck): boolean {
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
          p => p.setCode.toLowerCase() === card.card.setCode.toLowerCase() &&
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

  migrateCards(deck.cards)
  migrateCards(deck.alternates)
  migrateCards(deck.sideboard)

  return migrated
}

// Generate a unique ID for deck cards
export function generateDeckCardId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Note Card Reference
export interface NoteCardRef {
  cardName: string   // matches DeckCard.card.name
  ordinal: number    // 1-based rank (lower = more relevant)
}

// Deck Notes
export interface DeckNote {
  id: string
  title: string
  content: string           // markdown description
  noteType: NoteType
  cardRefs: NoteCardRef[]   // ordered associated cards
  roleId?: string           // optional role to propagate to cards
  createdAt: string
  updatedAt: string
}

// Migration helper for old DeckNote format
export function migrateDeckNote(note: Partial<DeckNote> & { id: string; title: string; content: string; createdAt: string; updatedAt: string }): DeckNote {
  return {
    ...note,
    noteType: note.noteType ?? 'general',
    cardRefs: note.cardRefs ?? [],
    roleId: note.roleId ?? undefined,
  }
}

// Propagate a note's role to all referenced cards in the deck
export function propagateNoteRole(deck: Deck, note: DeckNote): void {
  if (!note.roleId) return
  const refNames = new Set(note.cardRefs.map(r => r.cardName.toLowerCase()))
  const addRole = (cards: DeckCard[]) => {
    for (const card of cards) {
      if (refNames.has(card.card.name.toLowerCase()) && !card.roles.includes(note.roleId!)) {
        card.roles.push(note.roleId!)
      }
    }
  }
  addRole(deck.cards)
  addRole(deck.alternates)
  addRole(deck.sideboard)
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
  cards: DeckCard[]
  alternates: DeckCard[]
  sideboard: DeckCard[]
  commanders: CardIdentifier[]    // Commander(s) for Commander format
  commandersPulled?: PulledPrinting[]  // Track pulled status for commanders
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
  power?: string
  toughness?: string
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
    power?: string
    toughness?: string
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

// Pull List Configuration
export type PullListSortKey = 'collectorNumber' | 'rarity' | 'type' | 'manaCost' | 'name'

export interface PullListConfig {
  version: number
  updatedAt: string
  sortColumns: PullListSortKey[]  // Order determines sort priority
  showPulledSection: boolean      // Show "Already Pulled" section
  hideBasicLands: boolean         // Hide basic lands from pull list (default: true)
}

export const DEFAULT_PULL_LIST_CONFIG: PullListConfig = {
  version: 1,
  updatedAt: '',
  sortColumns: ['rarity', 'type', 'manaCost', 'name'],
  showPulledSection: true,
  hideBasicLands: true
}

// Cache Index Types
export interface CacheIndex {
  version: number
  updatedAt: string
  byName: Record<string, string>           // lowercase name -> scryfallId
  bySetCollector: Record<string, string>   // "set|collector" -> scryfallId
  entries: Record<string, CacheEntryMeta>
}

export interface CacheEntryMeta {
  scryfallId: string
  name: string
  setCode: string
  collectorNumber: string
  cachedAt: string
  jsonSize: number
  hasImage: boolean
  imageSize?: number
  imageFaces?: number  // 1 or 2 for DFCs
}

export interface CacheStats {
  jsonCacheCount: number
  jsonCacheSizeBytes: number
  imageCacheCount: number
  imageCacheSizeBytes: number
  totalSizeBytes: number
  oldestEntry?: string
  newestEntry?: string
}

export interface PreCacheResult {
  success: boolean
  cachedCards: number
  cachedImages: number
  errors: string[]
}
