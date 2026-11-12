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

/** How to pick the entry to remove. `entryId` wins over the name-based fields. */
export interface ListEntryTarget {
  entryId?: string
  cardName?: string
  setCode?: string
  collectorNumber?: string
}

const sameText = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

const matchesName = (target: ListEntryTarget) => (e: CardEntry): boolean =>
  sameText(e.card.name, target.cardName ?? '')
  && (target.setCode === undefined || sameText(e.card.setCode, target.setCode))
  && (target.collectorNumber === undefined || sameText(e.card.collectorNumber, target.collectorNumber))

function describeEntry(e: CardEntry): string {
  const extras = [
    e.notes ? 'notes' : undefined,
    e.potentialDecks?.length ? 'potential decks' : undefined,
  ].filter((x): x is string => x !== undefined)
  const printing = `${e.card.setCode.toUpperCase()} #${e.card.collectorNumber}`
  return `id=${e.id} (${printing}${extras.length ? `, has ${extras.join(' and ')}` : ''})`
}

function findCandidates(entries: CardEntry[], target: ListEntryTarget): CardEntry[] {
  if (target.entryId) {
    const found = entries.filter(e => e.id === target.entryId)
    if (found.length === 0) throw new Error(`Entry not found in list: ${target.entryId}`)
    return found
  }
  if (!target.cardName) throw new Error('entry_id or card_name is required to select an entry')
  const found = entries.filter(matchesName(target))
  if (found.length === 0) throw new Error(`Card not found in list: ${target.cardName}`)
  return found
}

/**
 * Remove a single entry from a list's main set. Selection is by `entryId`, or by
 * card name (optionally narrowed by set code and collector number). Throws if
 * nothing matches, or if a name matches several entries; that message lists the
 * candidates so the caller can retry with an `entryId`. Returns the new list and
 * the removed entry; does not mutate the input.
 */
export function removeEntryFromList(
  list: CardList,
  target: ListEntryTarget,
): { list: CardList; removed: CardEntry } {
  const entries = getCardListEntries(list)
  const candidates = findCandidates(entries, target)
  if (candidates.length > 1) {
    throw new Error(
      `"${target.cardName}" matches ${candidates.length} entries; nothing was removed. `
      + `Retry with entry_id: ${candidates.map(describeEntry).join('; ')}`,
    )
  }
  const [removed] = candidates
  return { list: withCardListEntries(list, entries.filter(e => e !== removed)), removed }
}
