import type { Deck, CardEntry, CardSet } from '../types/index.js'
import type { Migration } from './index.js'

// Pre-migration shape: CardEntry still carries `typeLine` at this point in
// the codebase. Migration 004 strips it.
type EntryWithTypeLine = CardEntry & { typeLine?: string }

/**
 * Migration 004: Strip the `typeLine` field from every CardEntry.
 *
 * `typeLine` was a denormalized cache of the Scryfall card's `type_line`.
 * Reader sites have been migrated to use the `getTypeLine(entry, cache)`
 * accessor which consults the Scryfall cache directly. The stored field is
 * no longer read, so it's safe to remove from disk.
 *
 * CardLists (interest list, etc.) are not migrated here because their entries
 * never carried `typeLine` in the first place — interest-list creation paths
 * don't go through Scryfall enrichment the way deck-card creation does.
 *
 * Idempotent: running on entries without `typeLine` is a no-op.
 */
export const migrateStripTypeLine: Migration = {
  version: 4,
  name: 'strip-typeline',
  migrate(deck: Deck) {
    const sets = (deck as unknown as { cardSets?: CardSet[] }).cardSets
    if (!sets) return

    for (const set of sets) {
      for (const entry of set.entries) {
        delete (entry as EntryWithTypeLine).typeLine
      }
    }
  },
}
