import type { CardEntry, CardSet } from '../types/index.js'

// --- Accessors ---

/** Find a card set by name, or undefined if not present. */
export function getCardSet(sets: CardSet[], name: string): CardSet | undefined {
  return sets.find(s => s.name === name)
}

/** Get the entries for a named card set, or empty array if not present. */
export function getCardSetEntries(sets: CardSet[], name: string): CardEntry[] {
  return getCardSet(sets, name)?.entries ?? []
}

/** Flat union of all entries across all card sets. */
export function getAllEntries(sets: CardSet[]): CardEntry[] {
  return sets.flatMap(s => s.entries)
}

// --- Immutable Updaters ---

/** Return a new card sets array with the named set's entries replaced. Creates the set if absent. */
export function withCardSet(sets: CardSet[], name: string, entries: CardEntry[]): CardSet[] {
  const index = sets.findIndex(s => s.name === name)
  if (index === -1) {
    return [...sets, { name, entries }]
  }
  const next = sets.slice()
  next[index] = { name, entries }
  return next
}

/** Return a new card sets array with the named set's entries mapped through fn. No-op if set absent. */
export function mapCardSet(sets: CardSet[], name: string, fn: (e: CardEntry) => CardEntry): CardSet[] {
  const set = getCardSet(sets, name)
  if (!set) return sets
  return withCardSet(sets, name, set.entries.map(fn))
}

/** Return a new card sets array with all entries in all sets mapped through fn. */
export function mapAllCardSets(sets: CardSet[], fn: (e: CardEntry) => CardEntry): CardSet[] {
  return sets.map(s => ({ name: s.name, entries: s.entries.map(fn) }))
}
