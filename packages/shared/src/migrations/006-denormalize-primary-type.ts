import type { Deck, CardSet } from '../types/index.js'
import { getPrimaryType } from '../constants/index.js'
import type { Migration, MigrationContext } from './index.js'

/**
 * Backfill `primaryType` on every CardEntry from the on-disk Scryfall cache.
 * Idempotent: entries that already have `primaryType`, or whose card isn't
 * in the cache yet, are left untouched — `getEntryPrimaryType` falls back
 * to a live cache lookup so the UI still resolves once the cache fills.
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
