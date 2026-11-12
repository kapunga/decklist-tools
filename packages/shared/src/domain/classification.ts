import type { CardEntry, PrimaryType, ScryfallCard } from '../types/index.js'
import { getPrimaryType } from '../constants/index.js'

// --- Card classification ---
// The single source of truth for "what type is this card", "is it a land" and
// "what is its mana value". Every view, filter and statistic should go through
// these so they can never disagree. Classification rule (see `getPrimaryType`):
// multi-face cards are classified by their FRONT face.

/**
 * A Scryfall card's type line. Reversible-layout cards (e.g. Secret Lair
 * "Mountain // Mountain") have no top-level `type_line`; fall back to the
 * first face's.
 */
export function getCardTypeLine(card: ScryfallCard): string | undefined {
  return card.type_line ?? card.card_faces?.[0]?.type_line
}

/**
 * A Scryfall card's mana value. Reversible-layout cards have no top-level
 * `cmc`; fall back to the first face's. `undefined` when there is no card.
 */
export function getCardManaValue(card: ScryfallCard | undefined): number | undefined {
  return card?.cmc ?? card?.card_faces?.[0]?.cmc
}

/**
 * A Scryfall card's mana cost. Two-image layouts (transform, modal_dfc,
 * reversible) have no top-level `mana_cost`, so fall back to the front face's.
 * One-image multi-part layouts (split, adventure, flip) keep their top-level
 * cost unchanged — e.g. Fire // Ice is `{1}{R} // {1}{U}`. `undefined` when
 * there is no card or it has no mana cost (lands).
 */
export function getCardManaCost(card: ScryfallCard | undefined): string | undefined {
  return card?.mana_cost || card?.card_faces?.[0]?.mana_cost || undefined
}

/** Look up an entry's Scryfall card in the cache, if it has one. */
export function getCachedCard(entry: CardEntry, cache: Map<string, ScryfallCard>): ScryfallCard | undefined {
  return entry.card.scryfallId ? cache.get(entry.card.scryfallId) : undefined
}

/** Entries whose Scryfall card is not in the cache (including entries with no `scryfallId`). */
export function findUncachedEntries(entries: CardEntry[], cache: Map<string, ScryfallCard>): CardEntry[] {
  return entries.filter(entry => !getCachedCard(entry, cache))
}

/** The distinct Scryfall ids of `entries` that can be fetched by id. */
export function getUncachedScryfallIds(entries: CardEntry[]): string[] {
  const ids = entries.flatMap(entry => (entry.card.scryfallId ? [entry.card.scryfallId] : []))
  return [...new Set(ids)]
}

/**
 * Get the type line for an entry by consulting the Scryfall cache. Returns
 * `undefined` when the cache has no entry for this card, or when the card has
 * no `scryfallId` to look up by.
 */
export function getTypeLine(entry: CardEntry, cache: Map<string, ScryfallCard>): string | undefined {
  const card = getCachedCard(entry, cache)
  return card ? getCardTypeLine(card) : undefined
}

/**
 * Resolve an entry's primary type given its (possibly missing) Scryfall card.
 * Prefers the denormalized `primaryType` stored on the entry; falls back to
 * classifying the card's type line; defaults to `'Other'`.
 */
export function resolvePrimaryType(entry: CardEntry, card: ScryfallCard | undefined): PrimaryType {
  if (entry.primaryType) return entry.primaryType
  const typeLine = card ? getCardTypeLine(card) : undefined
  return typeLine ? getPrimaryType(typeLine) : 'Other'
}

/**
 * Resolve an entry's primary type bucket via the Scryfall cache. Use this
 * anywhere a card's bucket is needed — it shields callers from
 * cache-population timing.
 */
export function getEntryPrimaryType(entry: CardEntry, cache: Map<string, ScryfallCard>): PrimaryType {
  return resolvePrimaryType(entry, getCachedCard(entry, cache))
}

/**
 * Whether a primary type counts as a land. Lands are exactly the `Land`
 * bucket, so land totals always equal the Land row of a type breakdown:
 * creature lands (Dryad Arbor) are creatures, and spell-front MDFCs
 * (Shatterskull Smashing) are spells.
 */
export function isLandPrimaryType(type: PrimaryType): boolean {
  return type === 'Land'
}

/** Whether an entry counts as a land, via the Scryfall cache. */
export function isLandEntry(entry: CardEntry, cache: Map<string, ScryfallCard>): boolean {
  return isLandPrimaryType(getEntryPrimaryType(entry, cache))
}
