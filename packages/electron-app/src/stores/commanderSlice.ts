import {
  addCommander as domainAddCommander,
  removeCommander as domainRemoveCommander,
} from '@mtg-deckbuilder/shared'
import type { CommanderSlice, SliceCreator } from './types'

export const createCommanderSlice: SliceCreator<CommanderSlice> = (_set, get) => ({
  setCommanders: async (deckId, commanders) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, commanders })
  },

  addCommander: async (deckId, commander) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck || deck.commanders.length >= 2) return

    try {
      const result = domainAddCommander(deck, commander)
      await get().updateDeck(result.deck)
    } catch {
      // Silently fail in UI (duplicate, wrong format, etc.)
    }
  },

  removeCommander: async (deckId, commanderName) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    try {
      const result = domainRemoveCommander(deck, commanderName)
      await get().updateDeck(result.deck)
    } catch {
      // Silently fail in UI (not found, wrong format, etc.)
    }
  },
})
