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
 *
 * TODO: Consider replacing with domain/cards.ts mergeCardIntoList for batch operations,
 * or removing if no longer needed after import flow is migrated to the domain layer.
 */
export function consolidateDuplicateCards(cards: DeckCard[]): DeckCard[] {
  const cardMap = new Map<string, DeckCard>()

  for (const card of cards) {
    const key = card.card.name.toLowerCase()
    const existing = cardMap.get(key)

    if (existing) {
      // Build a new merged card instead of mutating the existing entry
      const mergedNotes = card.notes && existing.notes && card.notes !== existing.notes
        ? `${existing.notes}\n${card.notes}`
        : card.notes || existing.notes

      cardMap.set(key, {
        ...existing,
        quantity: existing.quantity + card.quantity,
        roles: [...new Set([...existing.roles, ...card.roles])],
        addedAt: new Date(card.addedAt) < new Date(existing.addedAt) ? card.addedAt : existing.addedAt,
        isPinned: existing.isPinned || card.isPinned,
        notes: mergedNotes,
      })
    } else {
      // Clone the card to avoid mutating the original
      cardMap.set(key, { ...card, roles: [...card.roles] })
    }
  }

  return Array.from(cardMap.values())
}
