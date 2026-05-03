import type { Deck, CardSet } from '../types/index.js'
import { getPrimaryType } from '../constants/index.js'
import type { Migration, MigrationContext } from './index.js'

/**
 * Migration 006: Backfill `primaryType` on every CardEntry by looking up
 * each card's `type_line` in the on-disk Scryfall cache.
 *
 * `primaryType` is the categorical bucket used by type-aware UI (deck list
 * grouping, type filter, mana-base analytics). Migration 004 had stripped
 * the older inline `typeLine` field on the assumption that readers would
 * always go through the cache, but in practice the cache isn't always
 * populated — newly-added cards bucket as `'Other'` until they're explicitly
 * pre-cached. Storing the bucket on the entry restores local reasoning.
 *
 * Cards whose Scryfall data isn't in the disk cache at migration time stay
 * without a `primaryType` field; readers fall back to a live cache lookup
 * via `getEntryPrimaryType`, so the UI still resolves correctly once the
 * cache fills. The field will be populated permanently the next time
 * either (a) the entry is touched by a writer, or (b) a manual re-migration
 * pass runs against a populated cache.
 *
 * Idempotent: entries that already have `primaryType` are skipped.
 *
 * This migration deliberately reverses the direction of migration 004.
 * The earlier strip was safe-by-construction for an unknown set of writers
 * (including the now-archived Scala MCP server). All current writers
 * resolve a full ScryfallCard before constructing CardEntries, so
 * denormalizing the bucket no longer risks empty fields on write.
 */
export const migrateDenormalizePrimaryType: Migration = {
  version: 6,
  name: 'denormalize-primary-type',
  migrate(deck: Deck, context: MigrationContext) {
    const sets = (deck as unknown as { cardSets?: CardSet[] }).cardSets
    if (!sets) return

    for (const set of sets) {
      for (const entry of set.entries) {
        if (entry.primaryType) continue
        const scryfallId = entry.card.scryfallId
        if (!scryfallId) continue
        const card = context.lookupScryfallCard(scryfallId)
        if (!card?.type_line) continue
        entry.primaryType = getPrimaryType(card.type_line)
      }
    }
  },
}
