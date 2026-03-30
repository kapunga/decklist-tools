import type { Deck } from '../types/index.js'
import { NOTE_TYPE } from '../types/index.js'
import type { Migration } from './index.js'

/**
 * Migration 001: Populate default fields on deck notes.
 * Old notes may be missing noteType and cardRefs.
 * After this migration, migrateDeckNote is no longer needed at render time.
 */
export const migrateNotes: Migration = {
  version: 1,
  name: 'migrate-notes',
  migrate(deck: Deck) {
    for (const note of deck.notes ?? []) {
      if (note.noteType === undefined) {
        note.noteType = NOTE_TYPE.GENERAL
      }
      if (note.cardRefs === undefined) {
        note.cardRefs = []
      }
    }
  },
}
