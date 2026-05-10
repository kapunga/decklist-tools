import type { FormatType, ScryfallCard } from '../types/index.js'
import { FORMAT_TYPE } from '../types/index.js'
import { SCRYFALL } from '../constants/index.js'

// Export cached client
export { CachedScryfallClient } from './cachedClient.js'

const BASE_URL = 'https://api.scryfall.com'
const USER_AGENT = 'MTGDeckbuilder/1.0'

// Simple request queue for rate limiting
let lastRequestTime = 0

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < SCRYFALL.MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, SCRYFALL.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest)
    )
  }

  lastRequestTime = Date.now()

  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  })
}

// Scryfall Set type
export interface ScryfallSet {
  id: string
  code: string
  name: string
  set_type: string
  released_at?: string
  card_count: number
  icon_svg_uri?: string
}

// Generic Scryfall fetch with standard error handling.
// Returns null on 404 by default; pass on404 to override (e.g., return empty search results).
async function fetchFromScryfall<T>(
  url: string,
  context: string,
  on404?: () => T
): Promise<T | null> {
  try {
    const response = await rateLimitedFetch(url)
    if (!response.ok) {
      if (response.status === 404) return on404 ? on404() : null
      throw new Error(`Scryfall API error: ${response.status}`)
    }
    return await response.json() as T
  } catch (error) {
    console.error(`Error ${context}:`, error)
    return null
  }
}

// Get set information by set code
export async function getSetByCode(setCode: string): Promise<ScryfallSet | null> {
  return fetchFromScryfall<ScryfallSet>(
    `${BASE_URL}/sets/${setCode.toLowerCase()}`,
    'fetching set'
  )
}

// Response type for /sets endpoint
interface ScryfallSetsResponse {
  object: string
  has_more: boolean
  data: ScryfallSet[]
}

// Cache for all sets - stored in memory with expiry
let setsCache: ScryfallSet[] | null = null
let setsCacheTime = 0
const SETS_CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

// Get all sets from Scryfall (cached)
export async function getAllSets(): Promise<ScryfallSet[]> {
  // Return cached data if still valid
  const now = Date.now()
  if (setsCache && now - setsCacheTime < SETS_CACHE_DURATION_MS) {
    return setsCache
  }

  try {
    const response = await rateLimitedFetch(`${BASE_URL}/sets`)

    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.status}`)
    }

    const result = await response.json() as ScryfallSetsResponse
    setsCache = result.data || []
    setsCacheTime = now
    return setsCache
  } catch (error) {
    console.error('Error fetching sets:', error)
    // Return cached data if available, even if expired
    return setsCache || []
  }
}

export async function searchCardByName(name: string): Promise<ScryfallCard | null> {
  return fetchFromScryfall<ScryfallCard>(
    `${BASE_URL}/cards/named?fuzzy=${encodeURIComponent(name)}`,
    'searching for card'
  )
}

export async function searchCardByNameExact(name: string): Promise<ScryfallCard | null> {
  return fetchFromScryfall<ScryfallCard>(
    `${BASE_URL}/cards/named?exact=${encodeURIComponent(name)}`,
    'searching for card'
  )
}

export async function getCardBySetAndNumber(
  setCode: string,
  collectorNumber: string
): Promise<ScryfallCard | null> {
  return fetchFromScryfall<ScryfallCard>(
    `${BASE_URL}/cards/${setCode.toLowerCase()}/${collectorNumber}`,
    'fetching card'
  )
}

export async function getCardById(scryfallId: string): Promise<ScryfallCard | null> {
  return fetchFromScryfall<ScryfallCard>(
    `${BASE_URL}/cards/${scryfallId}`,
    'fetching card'
  )
}

export interface AutocompleteResult {
  data: string[]
}

export async function autocomplete(query: string): Promise<string[]> {
  if (query.length < 2) return []

  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`
    )

    if (!response.ok) return []

    const result = await response.json() as AutocompleteResult
    return result.data || []
  } catch (error) {
    console.error('Error in autocomplete:', error)
    return []
  }
}

export interface SearchResult {
  object: string
  total_cards: number
  has_more: boolean
  next_page?: string
  data: ScryfallCard[]
}

const emptySearchResult = (): SearchResult => ({ object: 'list', total_cards: 0, has_more: false, data: [] })

export async function searchCards(query: string): Promise<SearchResult | null> {
  return fetchFromScryfall<SearchResult>(
    `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`,
    'searching cards',
    emptySearchResult
  )
}

export async function searchCardsAll(query: string): Promise<ScryfallCard[]> {
  const all: ScryfallCard[] = []
  let url: string | undefined = `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`
  while (url) {
    const page: SearchResult | null = await fetchFromScryfall<SearchResult>(
      url,
      'searching cards (paginated)',
      emptySearchResult
    )
    if (!page) break
    all.push(...page.data)
    url = page.has_more ? page.next_page : undefined
  }
  return all
}

export function getCardImageUrl(
  card: ScryfallCard,
  size: 'small' | 'normal' | 'large' = 'normal'
): string {
  // Handle double-faced cards
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size]
  }

  if (card.image_uris) {
    return card.image_uris[size]
  }

  // Fallback to a placeholder
  return `https://api.scryfall.com/cards/${card.id}?format=image&version=${size}`
}

export function formatManaCost(manaCost?: string): string {
  if (!manaCost) return ''
  return manaCost
}

export function getColorIdentityString(colors: string[]): string {
  if (!colors || colors.length === 0) return 'Colorless'
  return colors.join('')
}

// WUBRG order for consistent color sorting
export const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G']

// Sort colors in WUBRG order
export function sortColorsWUBRG(colors: string[]): string[] {
  return [...colors].sort((a, b) => WUBRG_ORDER.indexOf(a) - WUBRG_ORDER.indexOf(b))
}

// Check if a card is legal in a specific format
export function isLegalInFormat(card: ScryfallCard, format: string): boolean {
  const formatKey = format.toLowerCase().replace('_', '')
  const legality = card.legalities[formatKey]
  return legality === 'legal' || legality === 'restricted'
}

export interface ListLegalitiesResult {
  /** Formats where every card is legal (or restricted). */
  intersection: FormatType[]
  /** Formats where at least one but not all cards are legal — disjoint from intersection. */
  someLegal: FormatType[]
  /** Formats where at least one card is explicitly banned. */
  someBanned: FormatType[]
}

const LEGALITY_CHECKED_FORMATS: FormatType[] = [
  FORMAT_TYPE.STANDARD,
  FORMAT_TYPE.PIONEER,
  FORMAT_TYPE.MODERN,
  FORMAT_TYPE.PAUPER,
  FORMAT_TYPE.LEGACY,
  FORMAT_TYPE.COMMANDER,
]

/**
 * Compute legality slices for a list of cards: which formats every card is
 * legal in (intersection), which formats some-but-not-all cards are legal in,
 * and which formats have at least one explicitly banned card. Kitchen-table
 * is omitted — always trivially legal.
 */
export function listLegalities(cards: ScryfallCard[]): ListLegalitiesResult {
  if (cards.length === 0) return { intersection: [], someLegal: [], someBanned: [] }
  const intersection: FormatType[] = []
  const someLegal: FormatType[] = []
  const someBanned: FormatType[] = []
  for (const format of LEGALITY_CHECKED_FORMATS) {
    const formatKey = format.toLowerCase().replace('_', '')
    let anyLegal = false
    let allLegal = true
    let anyBanned = false
    for (const card of cards) {
      const status = card.legalities[formatKey]
      if (status === 'legal' || status === 'restricted') anyLegal = true
      else allLegal = false
      if (status === 'banned') anyBanned = true
    }
    if (allLegal) intersection.push(format)
    else if (anyLegal) someLegal.push(format)
    if (anyBanned) someBanned.push(format)
  }
  return { intersection, someLegal, someBanned }
}

// Check if a card's color identity is a subset of allowed colors
export function matchesColorIdentity(card: ScryfallCard, allowedColors: string[]): boolean {
  if (!allowedColors || allowedColors.length === 0) {
    // If no color identity restriction, only colorless cards match
    return card.color_identity.length === 0
  }
  // Card's color identity must be a subset of allowed colors
  return card.color_identity.every(color => allowedColors.includes(color))
}

// Valid Scryfall format names for the f: filter
const VALID_SCRYFALL_FORMATS = new Set([
  'standard', 'modern', 'legacy', 'vintage', 'commander', 'pauper',
  'pioneer', 'historic', 'alchemy', 'brawl', 'explorer', 'penny',
  'oathbreaker', 'standardbrawl', 'paupercommander', 'duel', 'predh',
  'oldschool', 'premodern', 'timeless',
])

// Valid WUBRG color characters
const VALID_COLORS = new Set(['W', 'U', 'B', 'R', 'G'])

// Search cards with format legality and color identity filters
export async function searchCardsWithFilters(
  query: string,
  format?: string,
  colorIdentity?: string[]
): Promise<SearchResult | null> {
  // Build Scryfall query with filters
  let fullQuery = query

  // Add format legality filter (skip for kitchen_table)
  if (format && format !== FORMAT_TYPE.KITCHEN_TABLE) {
    const scryfallFormat = format.replace('_', '')
    if (!VALID_SCRYFALL_FORMATS.has(scryfallFormat)) {
      throw new Error(`Unknown format: ${format}`)
    }
    fullQuery += ` f:${scryfallFormat}`
  }

  // Add color identity filter
  if (colorIdentity && colorIdentity.length > 0) {
    const invalidColors = colorIdentity.filter(c => !VALID_COLORS.has(c))
    if (invalidColors.length > 0) {
      throw new Error(`Invalid color identity values: ${invalidColors.join(', ')}`)
    }
    const colorString = colorIdentity.join('')
    fullQuery += ` id<=${colorString}`
  } else if (colorIdentity && colorIdentity.length === 0) {
    // Colorless only
    fullQuery += ` id:c`
  }

  return searchCards(fullQuery)
}

// Get art crop URL for a card (for background images)
export function getCardArtCropUrl(card: ScryfallCard): string | null {
  // Try main image_uris first
  if (card.image_uris?.art_crop) {
    return card.image_uris.art_crop
  }
  // Try first card face for DFCs
  if (card.card_faces?.[0]?.image_uris?.art_crop) {
    return card.card_faces[0].image_uris.art_crop
  }
  return null
}

// Build an art crop URL directly from a Scryfall id, bypassing the API.
// Useful when the caller already has the id (e.g. a deck's commander) and
// wants to skip the getCardById round-trip just to render an image. The
// `front` URL is valid for every card in Scryfall — single-faced layouts
// (normal, adventure, split, flip, meld) and DFCs alike — so the default is
// correct universally. Pass 'back' explicitly only for transform/modal_dfc/
// reversible_card layouts when the caller specifically wants the back face.
export type ScryfallCardFace = 'front' | 'back'

export function buildArtCropUrlFromId(
  scryfallId: string,
  face: ScryfallCardFace = 'front',
): string {
  return `https://cards.scryfall.io/art_crop/${face}/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`
}

// Get price information from a card
export interface CardPrices {
  usd?: string
  usd_foil?: string
  eur?: string
  eur_foil?: string
  tcgplayer?: string
  cardmarket?: string
}

export function getCardPrices(card: ScryfallCard): CardPrices {
  return {
    usd: card.prices?.usd || undefined,
    usd_foil: card.prices?.usd_foil || undefined,
    eur: card.prices?.eur || undefined,
    eur_foil: card.prices?.eur_foil || undefined,
    tcgplayer: card.purchase_uris?.tcgplayer || undefined,
    cardmarket: card.purchase_uris?.cardmarket || undefined
  }
}

// Get all printings of a card by name
export async function getCardPrintings(cardName: string): Promise<SearchResult | null> {
  const query = `!"${cardName}" unique:prints order:released`
  return fetchFromScryfall<SearchResult>(
    `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`,
    'fetching card printings',
    emptySearchResult
  )
}

// Get card image URL for a specific face (0 = front, 1 = back)
export function getCardFaceImageUrl(
  card: ScryfallCard,
  face: 0 | 1 = 0,
  size: 'small' | 'normal' | 'large' = 'normal'
): string | null {
  // For single-faced cards, only face 0 is valid
  if (!card.card_faces || card.card_faces.length === 0) {
    if (face === 0 && card.image_uris) {
      return card.image_uris[size]
    }
    return null
  }

  // For double-faced cards
  const cardFace = card.card_faces[face]
  if (cardFace?.image_uris) {
    return cardFace.image_uris[size]
  }

  // Some DFCs have shared image_uris (like adventures)
  if (face === 0 && card.image_uris) {
    return card.image_uris[size]
  }

  return null
}
