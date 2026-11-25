import type { CardEntry } from '@/types'

// No stack of a single card goes past this, even where the rules set no limit (basic lands).
const MAX_QUANTITY = 99

/**
 * A quantity after a +/- step: at least one, and at most the card's limit. A limit of
 * Infinity, null or undefined means the rules do not cap it.
 */
export function clampQuantity(current: number, delta: number, limit: number | null | undefined): number {
  const ceiling = limit == null || limit === Infinity ? MAX_QUANTITY : limit
  return Math.max(1, Math.min(ceiling, current + delta))
}

/** The entries ordered by card name, as a new array. */
export function sortedByName(entries: readonly CardEntry[]): CardEntry[] {
  return [...entries].sort((a, b) => a.card.name.localeCompare(b.card.name))
}
