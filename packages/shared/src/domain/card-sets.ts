import type { CardEntry, CardSet, Deck } from '../types/index.js'
import { CARD_SET } from '../types/index.js'

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

// --- Deck-level Convenience ---

/** Shorthand: get mainboard entries from a deck. */
export function getMainboard(deck: Deck): CardEntry[] {
  return getCardSetEntries(deck.cardSets, CARD_SET.MAINBOARD)
}

/** Shorthand: get sideboard entries from a deck. */
export function getSideboard(deck: Deck): CardEntry[] {
  return getCardSetEntries(deck.cardSets, CARD_SET.SIDEBOARD)
}

/** Shorthand: get alternates entries from a deck. */
export function getAlternates(deck: Deck): CardEntry[] {
  return getCardSetEntries(deck.cardSets, CARD_SET.ALTERNATES)
}

/** Shorthand: get cut entries from a deck. */
export function getCutList(deck: Deck): CardEntry[] {
  return getCardSetEntries(deck.cardSets, CARD_SET.CUT)
}

/** Flat union of all entries across all card sets in a deck. */
export function getAllDeckEntries(deck: Deck): CardEntry[] {
  return getAllEntries(deck.cardSets)
}

/** Flat union of all entries except those in the cut set. The cards the deck is "still about". */
export function getNonCutEntries(deck: Deck): CardEntry[] {
  return deck.cardSets.filter(s => s.name !== CARD_SET.CUT).flatMap(s => s.entries)
}

/** Return a new deck with the named set's entries replaced. Creates the set if absent. */
export function withDeckCardSet(deck: Deck, name: string, entries: CardEntry[]): Deck {
  return { ...deck, cardSets: withCardSet(deck.cardSets, name, entries) }
}

/** Return a new deck with the named set's entries mapped through fn. No-op if set absent. */
export function mapDeckCardSet(deck: Deck, name: string, fn: (e: CardEntry) => CardEntry): Deck {
  return { ...deck, cardSets: mapCardSet(deck.cardSets, name, fn) }
}

/** Return a new deck with all entries across all card sets mapped through fn. */
export function mapAllDeckEntries(deck: Deck, fn: (e: CardEntry) => CardEntry): Deck {
  return { ...deck, cardSets: mapAllCardSets(deck.cardSets, fn) }
}
