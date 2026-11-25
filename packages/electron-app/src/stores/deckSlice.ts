import { createEmptyDeck, formatDefaults } from '@/types'
import type { Deck } from '@/types'
import type { DeckSlice, SliceCreator } from './types'

// Saving sends the deck across IPC, and the reply is a deep clone: same content, but
// every card entry a new object. Storing that clone would make a one-card edit look
// like a hundred changed cards to anything keyed on entry identity. The only things the
// save actually decides are `version` and `updatedAt`, so keep the deck we built and
// take just those two from the reply.
async function persistDeck(deck: Deck): Promise<Deck> {
  const saved = await window.electronAPI.saveDeck(deck) as Deck
  return { ...deck, version: saved.version, updatedAt: saved.updatedAt }
}

export const createDeckSlice: SliceCreator<DeckSlice> = (set, get) => ({
  addDeck: async (deck) => {
    const stored = await persistDeck(deck)
    set(state => ({ decks: [...state.decks, stored] }))
    return stored
  },

  createDeck: async (name, formatType) => {
    return get().addDeck(createEmptyDeck(name, formatType as keyof typeof formatDefaults))
  },

  updateDeck: async (deck) => {
    const stored = await persistDeck(deck)
    set(state => ({
      decks: state.decks.map(d => d.id === stored.id ? stored : d)
    }))
    return stored
  },

  deleteDeck: async (id) => {
    await window.electronAPI.deleteDeck(id)
    set(state => ({
      decks: state.decks.filter(d => d.id !== id),
      selectedDeckId: state.selectedDeckId === id ? null : state.selectedDeckId
    }))
  },

  setDeckArtCard: async (deckId, scryfallId, face) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, artCardScryfallId: scryfallId, artCardFace: face })
  },

  setDeckColorIdentity: async (deckId, colors) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, colorIdentity: colors })
  },
})
