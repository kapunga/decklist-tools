import { createEmptyDeck, formatDefaults } from '@/types'
import type { Deck } from '@/types'
import type { DeckSlice, SliceCreator } from './types'

export const createDeckSlice: SliceCreator<DeckSlice> = (set, get) => ({
  addDeck: async (deck) => {
    const saved = await window.electronAPI.saveDeck(deck) as Deck
    set(state => ({ decks: [...state.decks, saved] }))
    return saved
  },

  createDeck: async (name, formatType) => {
    return get().addDeck(createEmptyDeck(name, formatType as keyof typeof formatDefaults))
  },

  updateDeck: async (deck) => {
    const saved = await window.electronAPI.saveDeck(deck) as Deck
    set(state => ({
      decks: state.decks.map(d => d.id === saved.id ? saved : d)
    }))
    return saved
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
