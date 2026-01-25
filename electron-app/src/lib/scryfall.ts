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
