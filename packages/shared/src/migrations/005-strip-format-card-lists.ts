import type { Deck, DeckFormat } from '../types/index.js'
import type { Migration } from './index.js'

type FormatWithCardLists = DeckFormat & {
  unlimitedCards?: string[]
  specialLimitCards?: Record<string, number>
}

/**
 * Migration 005: Strip `unlimitedCards` and `specialLimitCards` from deck.format.
 *
 * These card-intrinsic limits ("A deck can have any number of cards named X",
 * Seven Dwarves: 7, etc.) used to live on each DeckFormat object. They now
 * live in a module-level in-memory map loaded on boot from Scryfall. The old
 * fields are ignored at runtime but linger in saved JSON until this migration
 * cleans them up.
 *
 * Idempotent: running on a format without either field is a no-op.
 */
export const migrateStripFormatCardLists: Migration = {
  version: 5,
  name: 'strip-format-card-lists',
  migrate(deck: Deck) {
    const format = deck.format as FormatWithCardLists | undefined
    if (!format) return
    delete format.unlimitedCards
    delete format.specialLimitCards
  },
}
