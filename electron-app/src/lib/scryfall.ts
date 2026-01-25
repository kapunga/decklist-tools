import type { ScryfallCard } from '@/types'
import { SCRYFALL } from '@/lib/constants'

const BASE_URL = 'https://api.scryfall.com'
const USER_AGENT = 'MTGDeckbuilderElectron/1.0'

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

export async function searchCardByName(name: string): Promise<ScryfallCard | null> {
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/named?fuzzy=${encodeURIComponent(name)}`
    )

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Scryfall API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error searching for card:', error)
    return null
  }
}

export async function getCardBySetAndNumber(
  setCode: string,
  collectorNumber: string
): Promise<ScryfallCard | null> {
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/${setCode.toLowerCase()}/${collectorNumber}`
    )

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Scryfall API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching card:', error)
    return null
  }
}

export async function getCardById(scryfallId: string): Promise<ScryfallCard | null> {
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/${scryfallId}`
    )

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Scryfall API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching card:', error)
    return null
  }
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

    const result: AutocompleteResult = await response.json()
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

export async function searchCards(query: string): Promise<SearchResult | null> {
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`
    )

    if (!response.ok) {
      if (response.status === 404) {
        return { object: 'list', total_cards: 0, has_more: false, data: [] }
      }
      throw new Error(`Scryfall API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error searching cards:', error)
    return null
  }
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
const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G']

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

// Check if a card's color identity is a subset of allowed colors
export function matchesColorIdentity(card: ScryfallCard, allowedColors: string[]): boolean {
  if (!allowedColors || allowedColors.length === 0) {
    // If no color identity restriction, only colorless cards match
    return card.color_identity.length === 0
  }
  // Card's color identity must be a subset of allowed colors
  return card.color_identity.every(color => allowedColors.includes(color))
}

// Search cards with format legality and color identity filters
export async function searchCardsWithFilters(
  query: string,
  format?: string,
  colorIdentity?: string[]
): Promise<SearchResult | null> {
  // Build Scryfall query with filters
  let fullQuery = query

  // Add format legality filter (skip for kitchen_table)
  if (format && format !== 'kitchen_table') {
    const scryfallFormat = format.replace('_', '')
    fullQuery += ` f:${scryfallFormat}`
  }

  // Add color identity filter
  if (colorIdentity && colorIdentity.length > 0) {
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
