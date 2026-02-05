import type { DeckCard } from '../types/index.js'

/**
 * Find a card in a list by name (case-insensitive)
 */
export function findCardByName<T extends { card: { name: string } }>(
  list: T[],
  name: string
): T | undefined {
  return list.find(c => c.card.name.toLowerCase() === name.toLowerCase())
}

/**
 * Find a card's index in a list by name (case-insensitive)
 */
export function findCardIndexByName<T extends { card: { name: string } }>(
  list: T[],
  name: string
): number {
  return list.findIndex(c => c.card.name.toLowerCase() === name.toLowerCase())
}

/**
 * Consolidate duplicate card entries in a list.
 * When duplicates are found: sums quantities, unions roles, keeps earliest addedAt,
 * preserves isPinned if any entry is pinned, and merges notes.
 */
export function consolidateDuplicateCards(cards: DeckCard[]): DeckCard[] {
  const cardMap = new Map<string, DeckCard>()

  for (const card of cards) {
    const key = card.card.name.toLowerCase()
    const existing = cardMap.get(key)

    if (existing) {
      // Merge: sum quantities, union roles, keep earlier addedAt
      existing.quantity += card.quantity
      existing.roles = [...new Set([...existing.roles, ...card.roles])]
      if (new Date(card.addedAt) < new Date(existing.addedAt)) {
        existing.addedAt = card.addedAt
      }
      // If either is pinned, keep it pinned
      existing.isPinned = existing.isPinned || card.isPinned
      // Merge notes if both have them
      if (card.notes && existing.notes && card.notes !== existing.notes) {
        existing.notes = `${existing.notes}\n${card.notes}`
      } else if (card.notes && !existing.notes) {
        existing.notes = card.notes
      }
    } else {
      // Clone the card to avoid mutating the original
      cardMap.set(key, { ...card, roles: [...card.roles] })
    }
  }

  return Array.from(cardMap.values())
}
