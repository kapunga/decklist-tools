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

