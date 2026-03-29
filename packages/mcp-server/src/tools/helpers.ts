import {
  Storage,
  type Deck,
  type CardIdentifier,
  type ScryfallCard,
  CachedScryfallClient,
} from '@mtg-deckbuilder/shared'

// Input length limits for tool arguments
const INPUT_LIMITS = {
  name: 200,
  description: 2000,
  notes: 10000,
  content: 10000,
  title: 200,
  query: 500,
  source: 500,
  card_name: 200,
  commander_name: 200,
  new_commander_name: 200,
  archetype: 200,
} as const

/**
 * Validate that string arguments don't exceed reasonable length limits.
 * Throws on the first field that exceeds its limit.
 */
export function validateInputLengths(args: Record<string, unknown>): void {
  for (const [key, maxLength] of Object.entries(INPUT_LIMITS)) {
    const value = args[key]
    if (typeof value === 'string' && value.length > maxLength) {
      throw new Error(`'${key}' exceeds maximum length of ${maxLength} characters (got ${value.length})`)
    }
  }

  // Validate card arrays — each entry should be short
  const cards = args.cards
  if (Array.isArray(cards)) {
    for (const card of cards) {
      if (typeof card === 'string' && card.length > 200) {
        throw new Error(`Card string exceeds maximum length of 200 characters`)
      }
    }
  }
}

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

/** Reset the singleton client — used in tests to ensure a fresh mock per test. */
export function resetCachedScryfallClient(): void {
  cachedClient = null
}

export async function fetchScryfallCard(
  storage: Storage,
  name: string,
  setCode?: string,
  collectorNumber?: string,
): Promise<ScryfallCard> {
  const client = getCachedScryfallClient(storage)
  const scryfallCard = setCode && collectorNumber
    ? await client.getCardBySetCollector(setCode, collectorNumber)
    : await client.getCardByName(name)

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
 * Returns { updatedRoles, updatedRole } with a new array. Does not mutate the input.
 */
export function updateRoleInList(
  roles: RoleDefinition[],
  roleId: string,
  updates: { name?: string; description?: string; color?: string }
): { updatedRoles: RoleDefinition[]; updatedRole: RoleDefinition } {
  const roleIndex = roles.findIndex((r) => r.id === roleId)
  if (roleIndex === -1) throw new Error(`Role not found: ${roleId}`)

  const updatedRole: RoleDefinition = {
    ...roles[roleIndex],
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.color !== undefined && { color: updates.color }),
  }

  const updatedRoles = [...roles]
  updatedRoles[roleIndex] = updatedRole
  return { updatedRoles, updatedRole }
}

/**
 * Delete a role from a list of roles.
 * Returns the new array without the deleted role. Does not mutate the input.
 */
export function deleteRoleFromList(roles: RoleDefinition[], roleId: string): RoleDefinition[] {
  const roleIndex = roles.findIndex((r) => r.id === roleId)
  if (roleIndex === -1) throw new Error(`Role not found: ${roleId}`)

  return roles.filter((_, i) => i !== roleIndex)
}
