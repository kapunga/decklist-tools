import type { Deck, CardEntry, CardSet } from '../types/index.js'
import { CARD_SET, CARD_SOURCE, OWNERSHIP_STATUS } from '../types/index.js'
import type { Migration } from './index.js'

// Pre-migration shape: may carry `inclusion` and `isPinned` fields that
// this migration strips. `CardEntry` no longer declares them; the cast below
// lets this file remain compile-clean while still reading the legacy fields.
type LegacyEntry = CardEntry & {
  inclusion?: 'confirmed' | 'considering' | 'cut'
  isPinned?: boolean
}

type InclusionValue = 'confirmed' | 'considering' | 'cut' | undefined

/**
 * Apply defaults for fields that are being made required, then strip
 * `isPinned` and `inclusion` from the entry. Returns the cleaned entry
 * along with the inclusion value the caller needs to route the entry.
 *
 * Note: any `typeLine` field on the input is dropped here. Users coming
 * from schema 2 (pre-003) lose their stored typeLine immediately; users
 * coming from schema 3 (which preserved typeLine in an older version of
 * this migration) get it stripped by migration 004 in the same pass.
 */
function cleanEntry(entry: LegacyEntry): {
  cleaned: CardEntry
  inclusion: InclusionValue
} {
  const inclusion = entry.inclusion
  const cleaned: CardEntry = {
    id: entry.id,
    card: entry.card,
    addedAt: entry.addedAt,
    quantity: entry.quantity ?? 1,
    roles: entry.roles ?? [],
    source: entry.source ?? CARD_SOURCE.USER,
    ownership: entry.ownership ?? OWNERSHIP_STATUS.UNKNOWN,
    notes: entry.notes,
    pulledPrintings: entry.pulledPrintings,
    potentialDecks: entry.potentialDecks,
  }
  return { cleaned, inclusion }
}

/**
 * Merge an entry into a set's entries by card name. If no match, append.
 * Sums quantities, unions roles, concatenates distinct notes. Used when
 * inclusion-driven moves produce duplicates in a target set.
 */
function mergeEntryIntoSet(entries: CardEntry[], incoming: CardEntry): CardEntry[] {
  const existingIndex = entries.findIndex(
    e => e.card.name.toLowerCase() === incoming.card.name.toLowerCase()
  )
  if (existingIndex === -1) {
    return [...entries, incoming]
  }
  const existing = entries[existingIndex]
  const merged: CardEntry = {
    ...existing,
    quantity: (existing.quantity ?? 1) + (incoming.quantity ?? 1),
    roles: Array.from(new Set([...(existing.roles ?? []), ...(incoming.roles ?? [])])),
    notes: existing.notes && incoming.notes && existing.notes !== incoming.notes
      ? `${existing.notes}\n${incoming.notes}`
      : (incoming.notes ?? existing.notes),
  }
  const result = [...entries]
  result[existingIndex] = merged
  return result
}

/**
 * Migration 003: CardEntry field cleanup.
 *
 * - Backfills defaults for fields being made required: `roles`, `source`,
 *   `quantity`, `ownership`.
 * - Strips the `isPinned` field (dead code — it only drove a display label).
 * - Converts the `inclusion` field to `CardSet` membership:
 *     - `'cut'` → entry moves to a new `cut` set
 *     - `'considering'` → entry moves to the `alternates` set (unless already there)
 *     - `'confirmed'` or undefined → entry stays in its current set
 * - Strips `inclusion` from every entry.
 *
 * Does NOT strip `typeLine`. That will happen in a later migration once
 * read sites have been migrated to a cache-based `getTypeLine` accessor.
 * Stripping it here would leave the readers fetching `undefined` and
 * silently mis-categorizing every card until the accessor refactor lands.
 *
 * Idempotent: applying defaults to already-defaulted values is a no-op,
 * and entries without an `inclusion` field always go to the "stays" bucket.
 */
export const migrateCardEntryCleanup: Migration = {
  version: 3,
  name: 'card-entry-cleanup',
  migrate(deck: Deck) {
    const sets = (deck as unknown as { cardSets?: CardSet[] }).cardSets
    if (!sets) return

    const toAlternates: CardEntry[] = []
    const toCut: CardEntry[] = []

    for (const set of sets) {
      const stays: CardEntry[] = []
      for (const rawEntry of set.entries) {
        const { cleaned, inclusion } = cleanEntry(rawEntry as LegacyEntry)
        if (inclusion === 'cut') {
          toCut.push(cleaned)
        } else if (inclusion === 'considering' && set.name !== CARD_SET.ALTERNATES) {
          toAlternates.push(cleaned)
        } else {
          stays.push(cleaned)
        }
      }
      set.entries = stays
    }

    if (toAlternates.length > 0) {
      let alternatesSet = sets.find(s => s.name === CARD_SET.ALTERNATES)
      if (!alternatesSet) {
        alternatesSet = { name: CARD_SET.ALTERNATES, entries: [] }
        sets.push(alternatesSet)
      }
      for (const entry of toAlternates) {
        alternatesSet.entries = mergeEntryIntoSet(alternatesSet.entries, entry)
      }
    }

    if (toCut.length > 0) {
      let cutSet = sets.find(s => s.name === CARD_SET.CUT)
      if (!cutSet) {
        cutSet = { name: CARD_SET.CUT, entries: [] }
        sets.push(cutSet)
      }
      for (const entry of toCut) {
        cutSet.entries = mergeEntryIntoSet(cutSet.entries, entry)
      }
    }
  },
}
