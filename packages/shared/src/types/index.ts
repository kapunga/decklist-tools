import { getDeckLimit } from '../cards/deck-limits.js'

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
  flavorName?: string
  setCode: string
  collectorNumber: string
  colorIdentity?: string[]
}

/** Returns the flavor name if present, otherwise the canonical name. */
export function getCardDisplayName(card: CardIdentifier): string {
  return card.flavorName ?? card.name
}

/** Returns ' (canonical name)' when the card has a flavor name, empty string otherwise. */
export function getCanonicalSuffix(card: CardIdentifier): string {
  return card.flavorName ? ` (${card.name})` : ''
}

// Discriminator constants — single source of truth; types derived via typeof

export const OWNERSHIP_STATUS = {
  UNKNOWN: 'unknown',
  OWNED: 'owned',
  NEED_TO_BUY: 'need_to_buy',
} as const
export type OwnershipStatus = typeof OWNERSHIP_STATUS[keyof typeof OWNERSHIP_STATUS]

export const CARD_SOURCE = {
  USER: 'user',
  IMPORT: 'import',
  CLAUDE: 'claude',
} as const
export type CardSource = typeof CARD_SOURCE[keyof typeof CARD_SOURCE]

export const FORMAT_TYPE = {
  COMMANDER: 'commander',
  STANDARD: 'standard',
  MODERN: 'modern',
  PIONEER: 'pioneer',
  LEGACY: 'legacy',
  PAUPER: 'pauper',
  KITCHEN_TABLE: 'kitchen_table',
} as const
export type FormatType = typeof FORMAT_TYPE[keyof typeof FORMAT_TYPE]

// Commander is the only format with a commander zone today. Kept as a helper
// so future commander-zone formats (Oathbreaker, etc.) can be added in one place.
export function isCommanderLikeFormat(type: FormatType): boolean {
  return type === FORMAT_TYPE.COMMANDER
}

export const NOTE_TYPE = {
  COMBO: 'combo',
  SYNERGY: 'synergy',
  THEME: 'theme',
  STRATEGY: 'strategy',
  GENERAL: 'general',
} as const
export type NoteType = typeof NOTE_TYPE[keyof typeof NOTE_TYPE]

// Card set names — semantic names used as keys in CardSet[]
export const CARD_SET = {
  MAINBOARD: 'mainboard',
  SIDEBOARD: 'sideboard',
  ALTERNATES: 'alternates',
  CUT: 'cut',
} as const
export type CardSetName = typeof CARD_SET[keyof typeof CARD_SET]

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
}

export const formatDefaults: Record<FormatType, DeckFormat> = {
  [FORMAT_TYPE.COMMANDER]: {
    type: FORMAT_TYPE.COMMANDER,
    deckSize: 100,
    sideboardSize: 0,
    cardLimit: 1,
  },
  [FORMAT_TYPE.STANDARD]: {
    type: FORMAT_TYPE.STANDARD,
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
  },
  [FORMAT_TYPE.MODERN]: {
    type: FORMAT_TYPE.MODERN,
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
  },
  [FORMAT_TYPE.PIONEER]: {
    type: FORMAT_TYPE.PIONEER,
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
  },
  [FORMAT_TYPE.LEGACY]: {
    type: FORMAT_TYPE.LEGACY,
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
  },
  [FORMAT_TYPE.PAUPER]: {
    type: FORMAT_TYPE.PAUPER,
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: 4,
  },
  [FORMAT_TYPE.KITCHEN_TABLE]: {
    type: FORMAT_TYPE.KITCHEN_TABLE,
    deckSize: 60,
    sideboardSize: 15,
    cardLimit: Infinity,
  },
}

// Pulled Printing - tracks which specific printings were pulled for a card
export interface PulledPrinting {
  setCode: string
  collectorNumber: string
  quantity: number
}

// Helper to get total pulled quantity across all printings
export function getTotalPulledQuantity(card: CardEntry): number {
  return (card.pulledPrintings ?? []).reduce((sum, p) => sum + p.quantity, 0)
}

// Check if a card is fully pulled based on pulledPrintings
export function isCardFullyPulled(card: CardEntry): boolean {
  return getTotalPulledQuantity(card) >= card.quantity
}


// Generate a unique ID for deck cards
export function generateDeckCardId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Primary card type bucket — the categorical projection of Scryfall's
// `type_line` used throughout the UI for grouping, filtering, and analytics.
// Stored on each `CardEntry` so type-aware UI doesn't depend on a populated
// Scryfall cache. See `getEntryPrimaryType` for read-side resolution rules.
export const PRIMARY_TYPES = [
  'Creature',
  'Planeswalker',
  'Battle',
  'Artifact',
  'Enchantment',
  'Land',
  'Instant',
  'Sorcery',
  'Other',
] as const
export type PrimaryType = typeof PRIMARY_TYPES[number]

// Unified Card Entry — a card in any collection (deck, list, etc.)
export interface CardEntry {
  id: string
  card: CardIdentifier
  notes?: string
  addedAt: string
  source: CardSource
  quantity: number
  ownership: OwnershipStatus
  roles: string[]
  pulledPrintings?: PulledPrinting[]
  // Categorical bucket derived from Scryfall's `type_line` at write time.
  // Optional for backward compat with pre-migration entries; readers should
  // go through `getEntryPrimaryType` which falls back to a cache lookup.
  primaryType?: PrimaryType
  // List-context fields
  potentialDecks?: string[]
}

// Named group of card entries
export interface CardSet {
  name: string
  entries: CardEntry[]
}

// Note Card Reference
export interface NoteCardRef {
  cardName: string   // matches CardEntry.card.name
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
    noteType: note.noteType ?? NOTE_TYPE.GENERAL,
    cardRefs: note.cardRefs ?? [],
    roleId: note.roleId ?? undefined,
  }
}

/**
 * Propagate a note's role to all referenced cards in the deck.
 * @mutates deck — adds roleId to matching cards' roles arrays in place.
 */
export function propagateNoteRole(deck: Deck, note: DeckNote): void {
  if (!note.roleId) return
  const refNames = new Set(note.cardRefs.map(r => r.cardName.toLowerCase()))
  for (const set of deck.cardSets) {
    for (const entry of set.entries) {
      if (refNames.has(entry.card.name.toLowerCase())) {
        if (!entry.roles) entry.roles = []
        if (!entry.roles.includes(note.roleId!)) {
          entry.roles.push(note.roleId!)
        }
      }
    }
  }
}

// Deck art face — three render strategies:
//   'front'   → front URL, upright (default)
//   'back'    → back URL, upright (DFC-style layouts only)
//   'flipped' → front URL, rotated 180° (CHK-style flip layout only)
// Validity depends on the underlying card's Scryfall layout — see
// `isArtCardFaceValid`. Use the validator anywhere a face is being chosen
// against an unknown card; the toggle in the deck-tile UI is safe by
// construction (it derives the new face from the layout itself).
export type ArtCardFace = 'front' | 'back' | 'flipped'

// Layouts where Scryfall returns a distinct image_uris per face.
export const TWO_FACED_LAYOUTS = ['transform', 'modal_dfc', 'reversible_card'] as const

// Layouts that share one image but render the alternate face by 180° rotation.
export const ROTATED_LAYOUTS = ['flip'] as const

// Whether `face` is a coherent choice for a card with the given Scryfall
// layout. 'front' is always valid; 'back' requires a two-faced layout;
// 'flipped' requires a rotation-style layout. Used as a render-side
// fallback (incoherent stored face → render front instead).
export function isArtCardFaceValid(face: ArtCardFace, layout: string): boolean {
  if (face === 'front') return true
  if (face === 'back') return (TWO_FACED_LAYOUTS as readonly string[]).includes(layout)
  if (face === 'flipped') return (ROTATED_LAYOUTS as readonly string[]).includes(layout)
  return false
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
  cardSets: CardSet[]             // Named card sets: 'mainboard', 'sideboard', 'alternates', or custom
  commanders: CardIdentifier[]    // Commander(s) for Commander format
  commandersPulled?: PulledPrinting[]  // Track pulled status for commanders
  customRoles: RoleDefinition[]   // Deck-specific custom roles
  notes: DeckNote[]
  artCardScryfallId?: string      // Scryfall ID for background art (override; default is derived)
  artCardFace?: ArtCardFace       // Face of artCardScryfallId to render; absent = front
  colorIdentity?: string[]        // Color identity (for commander, derived from commander card)
  schemaVersion?: number          // Schema migration version (0 = pre-migration, undefined treated as 0)
}

// Taxonomy - global role definitions shared across all decks
export interface Taxonomy {
  version: number
  updatedAt: string
  globalRoles: RoleDefinition[]
}

// Card List — generic named collection of cards (replaces InterestList)
export const INTEREST_LIST_ID = '00000000-0000-4000-8000-000000000001'

export interface CardList {
  id: string
  name: string
  description?: string
  version: number
  createdAt: string
  updatedAt: string
  cardSets: CardSet[]
}

// Themes
export type ThemeId =
  | 'library'
  | 'fantasy'
  | 'steampunk'
  | 'ukiyoe'
  | 'cyberpunk'
  | 'gothic'

export type ThemeMode = 'light' | 'dark'

export const LIGHT_THEMES: readonly ThemeId[] = ['library', 'fantasy', 'steampunk', 'ukiyoe'] as const
export const DARK_THEMES: readonly ThemeId[] = ['cyberpunk', 'gothic'] as const
export const ALL_THEMES: readonly ThemeId[] = [...LIGHT_THEMES, ...DARK_THEMES] as const

export const THEME_MODE: Record<ThemeId, ThemeMode> = {
  library: 'light',
  fantasy: 'light',
  steampunk: 'light',
  ukiyoe: 'light',
  cyberpunk: 'dark',
  gothic: 'dark',
}

/**
 * Normalize an unknown theme value from config. Migrates legacy `'light'|'dark'`
 * values to concrete themes, and falls back to `'library'` for anything unknown.
 */
export function normalizeTheme(value: unknown): ThemeId {
  if (value === 'light') return 'library'
  if (value === 'dark') return 'gothic'
  if (typeof value === 'string' && ALL_THEMES.includes(value as ThemeId)) {
    return value as ThemeId
  }
  return 'library'
}

// Config
export interface Config {
  scryfallCacheExpiryDays: number
  theme: ThemeId
  imageCacheEnabled: boolean
  imageCacheMaxSize: number
  defaultFormat?: FormatType
}

// Scryfall types
export interface ScryfallCard {
  id: string
  name: string
  flavor_name?: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  colors?: string[]
  color_identity: string[]
  set: string
  set_name?: string  // Full set name (e.g., "Modern Horizons 2")
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

// Extract oracle text, handling multi-faced cards (Rooms, DFCs, split, adventure, etc.)
export function getOracleText(card: ScryfallCard): string | undefined {
  if (card.card_faces && card.card_faces.length >= 2) {
    const faceTexts = card.card_faces
      .filter(face => face.oracle_text)
      .map(face => `[${face.name}]\n${face.oracle_text}`)

    if (faceTexts.length > 0) {
      return faceTexts.join('\n\n')
    }
  }

  return card.oracle_text
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
    cardSets: [
      { name: CARD_SET.MAINBOARD, entries: [] },
      { name: CARD_SET.SIDEBOARD, entries: [] },
      { name: CARD_SET.ALTERNATES, entries: [] },
    ],
    commanders: [],
    customRoles: [],
    notes: []
  }
}

// Get card limit for a specific card in a format.
// Card-intrinsic limits (from "A deck can have..." oracle text) override format defaults.
// Those are loaded on boot via loadCardDeckLimits() into the in-memory map.
export function getCardLimit(cardName: string, format: DeckFormat): number {
  if (isBasicLand(cardName)) return Infinity
  const intrinsic = getDeckLimit(cardName)
  if (intrinsic !== undefined) return intrinsic
  return format.cardLimit
}

export function getCardCount(deck: Deck): number {
  const mainboard = deck.cardSets.find(s => s.name === CARD_SET.MAINBOARD)?.entries ?? []
  const mainDeckCount = mainboard.reduce((sum, c) => sum + c.quantity, 0)

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

// Pull List Types
export interface PullListItem {
  cardName: string
  setCode: string
  setName: string
  collectorNumber: string
  rarity: string
  typeLine: string
  manaCost: string
  cmc: number
  quantityNeeded: number
  quantityPulledThisPrint: number
  quantityPulledTotal: number
  remainingNeeded: number
}

export interface PullListGroup {
  setCode: string
  setName: string
  items: PullListItem[]
}

// Pull List Configuration
export type PullListSortKey = 'collectorNumber' | 'rarity' | 'type' | 'manaCost' | 'name'
export type PullListSource = 'mainDeck' | 'maybeboard'

export interface PullListConfig {
  version: number
  updatedAt: string
  sortColumns: PullListSortKey[]  // Order determines sort priority
  showPulledSection: boolean      // Show "Already Pulled" section
  hideBasicLands: boolean         // Hide basic lands from pull list (default: true)
  source: PullListSource          // Which cards to show: main deck or maybeboard
}

export const DEFAULT_PULL_LIST_CONFIG: PullListConfig = {
  version: 1,
  updatedAt: '',
  sortColumns: ['rarity', 'type', 'manaCost', 'name'],
  showPulledSection: true,
  hideBasicLands: true,
  source: 'mainDeck'
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
