import {
  Storage,
  type Deck,
  type CardIdentifier,
  type ScryfallCard,
  CachedScryfallClient,
} from '@mtg-deckbuilder/shared'

export interface ParsedCardString {
  quantity: number
  setCode: string
  collectorNumber: string
}

/**
 * Parse a card string in the format "[Nx ]<set_code> <collector_number>"
 * Examples: "fdn 542" -> qty 1, set fdn, collector 542
 *           "2x woe 138" -> qty 2, set woe, collector 138
 */
export function parseCardString(card: string): ParsedCardString {
  const trimmed = card.trim()
  const match = trimmed.match(/^(?:(\d+)x\s+)?(\S+)\s+(\S+)$/i)
  if (!match) throw new Error(`Invalid card string format: "${card}". Expected "[Nx ]<set_code> <collector_number>"`)
  return {
    quantity: match[1] ? parseInt(match[1], 10) : 1,
    setCode: match[2],
    collectorNumber: match[3],
  }
}

export function getDeckOrThrow(storage: Storage, deckId: string): Deck {
  const deck = storage.getDeck(deckId)
  if (!deck) throw new Error(`Deck not found: ${deckId}`)
  return deck
}

// Singleton cached client instance
let cachedClient: CachedScryfallClient | null = null

export function getCachedScryfallClient(storage: Storage): CachedScryfallClient {
  if (!cachedClient) {
    cachedClient = new CachedScryfallClient(storage)
  }
  return cachedClient
}

export async function fetchScryfallCard(
  name: string,
  setCode?: string,
  collectorNumber?: string,
  storage?: Storage
): Promise<ScryfallCard> {
  let scryfallCard: ScryfallCard | null = null

  // Use cached client if storage is provided
  if (storage) {
    const client = getCachedScryfallClient(storage)
    if (setCode && collectorNumber) {
      scryfallCard = await client.getCardBySetCollector(setCode, collectorNumber)
    } else {
      scryfallCard = await client.getCardByName(name)
    }
  } else {
    // Fallback to direct API calls without caching
    const { searchCardByName, getCardBySetAndNumber } = await import('@mtg-deckbuilder/shared')
    if (setCode && collectorNumber) {
      scryfallCard = await getCardBySetAndNumber(setCode, collectorNumber)
    } else {
      scryfallCard = await searchCardByName(name)
    }
  }

  if (!scryfallCard) throw new Error(`Card not found: ${name}`)
  return scryfallCard
}

export function createCardIdentifier(scryfallCard: ScryfallCard): CardIdentifier {
  return {
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    setCode: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
  }
}

// Re-export from shared with legacy names for backwards compatibility
export { findCardByName as findCardInList, findCardIndexByName as findCardIndexInList } from '@mtg-deckbuilder/shared'

import type { RoleDefinition } from '@mtg-deckbuilder/shared'

/**
 * Update a role's properties in a list of roles.
 * Returns the updated role or throws if not found.
 */
export function updateRoleInList(
  roles: RoleDefinition[],
  roleId: string,
  updates: { name?: string; description?: string; color?: string }
): RoleDefinition {
  const roleIndex = roles.findIndex((r) => r.id === roleId)
  if (roleIndex === -1) throw new Error(`Role not found: ${roleId}`)

  if (updates.name !== undefined) roles[roleIndex].name = updates.name
  if (updates.description !== undefined) roles[roleIndex].description = updates.description
  if (updates.color !== undefined) roles[roleIndex].color = updates.color

  return roles[roleIndex]
}

/**
 * Delete a role from a list of roles.
 * Returns the deleted role's id or throws if not found.
 */
export function deleteRoleFromList(roles: RoleDefinition[], roleId: string): string {
  const roleIndex = roles.findIndex((r) => r.id === roleId)
  if (roleIndex === -1) throw new Error(`Role not found: ${roleId}`)

  roles.splice(roleIndex, 1)
  return roleId
}
