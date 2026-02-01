import { createEmptyDeck, formatDefaults } from '@/types'
import type { DeckSlice, SliceCreator } from './types'

export const createDeckSlice: SliceCreator<DeckSlice> = (set, get) => ({
  createDeck: async (name, formatType) => {
    const deck = createEmptyDeck(name, formatType as keyof typeof formatDefaults)
    await window.electronAPI.saveDeck(deck)
    set(state => ({ decks: [...state.decks, deck] }))
    return deck
  },

  updateDeck: async (deck) => {
    await window.electronAPI.saveDeck(deck)
    set(state => ({
      decks: state.decks.map(d => d.id === deck.id ? deck : d)
    }))
  },

  deleteDeck: async (id) => {
    await window.electronAPI.deleteDeck(id)
    set(state => ({
      decks: state.decks.filter(d => d.id !== id),
      selectedDeckId: state.selectedDeckId === id ? null : state.selectedDeckId
    }))
  },

  setDeckArtCard: async (deckId, scryfallId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, artCardScryfallId: scryfallId })
  },

  setDeckColorIdentity: async (deckId, colors) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, colorIdentity: colors })
  },
})
