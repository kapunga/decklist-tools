import type { CardEntry, CardList } from '../types/index.js'
import { CARD_SET, INTEREST_LIST_ID } from '../types/index.js'

/**
 * A `CardList` always operates on a single primary `CardSet` (the "main"
 * entries). These helpers shield callers from the `cardSets[0]` indexing and
 * the empty-list fallback.
 */

export function getCardListEntries(list: CardList): CardEntry[] {
  return list.cardSets[0]?.entries ?? []
}

export function withCardListEntries(list: CardList, entries: CardEntry[]): CardList {
  const setName = list.cardSets[0]?.name ?? CARD_SET.MAINBOARD
  return { ...list, cardSets: [{ name: setName, entries }] }
}

export function mapCardListEntries(list: CardList, fn: (e: CardEntry) => CardEntry): CardList {
  return withCardListEntries(list, getCardListEntries(list).map(fn))
}

/** True when the list is the project-wide well-known interest list. */
export function isWellKnownList(list: CardList): boolean {
  return list.id === INTEREST_LIST_ID
}
