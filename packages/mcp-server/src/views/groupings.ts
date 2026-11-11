import type { CardEntry, PrimaryType, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getEntryPrimaryType, CARD_TYPE_ORDER } from '@mtg-deckbuilder/shared'

// --- deck_list groupings ---
// A grouping only partitions a section's entries into labelled groups; it
// never formats cards. Every grouping feeds the same section renderer and
// card-line formatter (full-view.ts), so flat and grouped output cannot drift.

/** A labelled subset of a section's entries. */
export interface CardGroup {
  heading: string
  description?: string
  entries: CardEntry[]
}

/** Partition a section's entries into ordered groups. An entry may appear in several groups. */
export type Grouping = (entries: CardEntry[]) => CardGroup[]

/**
 * The grouping for a `deck_list` call, or `undefined` for a flat list.
 * `group_by` wins over `sort_by: set` (which groups by set).
 */
export function selectGrouping(
  groupBy: string | undefined,
  sortBy: string | undefined,
  cache: Map<string, ScryfallCard>,
  roleLookup: Map<string, RoleDefinition>,
): Grouping | undefined {
  if (groupBy === 'type') return groupByType(cache)
  if (groupBy === 'role') return groupByRole(roleLookup)
  if (sortBy === 'set') return groupBySet
  return undefined
}

/** One group per primary type (as `deck_curve` classifies), in CARD_TYPE_ORDER, cards by name. */
export function groupByType(cache: Map<string, ScryfallCard>): Grouping {
  return entries =>
    [...partition(entries, e => [getEntryPrimaryType(e, cache)])]
      .sort(([a], [b]) => typeRank(a) - typeRank(b))
      .map(([type, typeEntries]) => ({ heading: type, entries: sortByName(typeEntries) }))
}

/** One group per role (by role id), then `Unassigned` for entries without roles. */
export function groupByRole(roleLookup: Map<string, RoleDefinition>): Grouping {
  return entries => {
    const roleGroups = [...partition(entries, e => e.roles)]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([roleId, roleEntries]) => roleGroup(roleLookup.get(roleId), roleId, roleEntries))
    const unassigned = entries.filter(e => e.roles.length === 0)
    return unassigned.length > 0 ? [...roleGroups, { heading: 'Unassigned', entries: unassigned }] : roleGroups
  }
}

/** One group per set code (alphabetical), cards by collector number. */
export const groupBySet: Grouping = entries =>
  [...partition(entries, e => [e.card.setCode])]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([setCode, setEntries]) => ({ heading: setCode.toUpperCase(), entries: sortByCollectorNumber(setEntries) }))

function roleGroup(role: RoleDefinition | undefined, roleId: string, entries: CardEntry[]): CardGroup {
  return { heading: role?.name || roleId, description: role?.description || undefined, entries }
}

/** Group entries under every key `keysOf` returns, keeping first-seen key order. */
function partition<K>(entries: CardEntry[], keysOf: (entry: CardEntry) => K[]): Map<K, CardEntry[]> {
  return entries.reduce((groups, entry) => {
    for (const key of keysOf(entry)) groups.set(key, [...(groups.get(key) ?? []), entry])
    return groups
  }, new Map<K, CardEntry[]>())
}

function typeRank(type: PrimaryType): number {
  return CARD_TYPE_ORDER.indexOf(type as typeof CARD_TYPE_ORDER[number])
}

function sortByName(entries: CardEntry[]): CardEntry[] {
  return [...entries].sort((a, b) => a.card.name.localeCompare(b.card.name))
}

function sortByCollectorNumber(entries: CardEntry[]): CardEntry[] {
  return [...entries].sort((a, b) => a.card.collectorNumber.localeCompare(b.card.collectorNumber, undefined, { numeric: true }))
}
