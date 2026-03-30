import type { Deck, ScryfallCard } from '../types/index.js'
import { migrateNotes } from './001-migrate-notes.js'

// --- Migration Types ---

export interface MigrationContext {
  lookupScryfallCard: (scryfallId: string) => ScryfallCard | null
}

export interface Migration {
  version: number
  name: string
  migrate: (deck: Deck, context: MigrationContext) => void
}

// --- Registry ---
// Add new migrations here in version order.

const migrations: Migration[] = [
  migrateNotes,
]

/**
 * The current schema version. Equal to the highest migration version.
 * New decks are created at this version. Decks below it are migrated on load.
 */
export const CURRENT_SCHEMA_VERSION = migrations.length > 0
  ? migrations[migrations.length - 1].version
  : 0

/**
 * Run all pending migrations on a deck.
 * Returns true if any migrations were applied (deck was modified).
 * @mutates deck — migrations modify the deck in place.
 */
export function runMigrations(deck: Deck, context: MigrationContext): boolean {
  const startVersion = deck.schemaVersion ?? 0
  if (startVersion >= CURRENT_SCHEMA_VERSION) return false

  for (const migration of migrations) {
    if (migration.version > startVersion) {
      migration.migrate(deck, context)
    }
  }

  deck.schemaVersion = CURRENT_SCHEMA_VERSION
  return true
}
