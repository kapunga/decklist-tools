import type { Deck, CardSet } from '../types/index.js'
import { getPrimaryType } from '../constants/index.js'
import { getCardTypeLine } from '../domain/classification.js'
import type { Migration, MigrationContext } from './index.js'

/**
 * Recompute `primaryType` for every cached entry using the front-face rule.
 * Values stored before that rule scanned the whole `Front // Back` type line,
 * so e.g. Esper Origins (`Sorcery // Enchantment Creature`) was stored as a
 * Creature and Balamb Garden (`Land // Artifact`) as an Artifact. Entries whose
 * card isn't cached keep their stored value. Idempotent.
 */
export const migrateReclassifyPrimaryType: Migration = {
  version: 7,
  name: 'reclassify-primary-type',
  migrate(deck: Deck, context: MigrationContext) {
    const sets = (deck as unknown as { cardSets?: CardSet[] }).cardSets
    if (!sets) return

    for (const set of sets) {
      for (const entry of set.entries) {
        const scryfallId = entry.card.scryfallId
        if (!scryfallId) continue
        const card = context.lookupScryfallCard(scryfallId)
        const typeLine = card ? getCardTypeLine(card) : undefined
        if (!typeLine) continue
        entry.primaryType = getPrimaryType(typeLine)
      }
    }
  },
}
