import type { CardEntry } from '@/types'
import { CARD_SET } from '@/types'
import {
  addCardToDeck,
  removeCardFromDeck,
  moveCard as domainMoveCard,
  findCardAcrossLists,
  mapAllDeckEntries,
} from '@mtg-deckbuilder/shared'
import type { CardSlice, SliceCreator } from './types'

export const createCardSlice: SliceCreator<CardSlice> = (_set, get) => ({
  addCardToDeck: async (deckId, card, target = CARD_SET.MAINBOARD) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const result = addCardToDeck(deck, card, target)
    await get().updateDeck(result.deck)
  },

  removeCardFromDeck: async (deckId, cardName, target = CARD_SET.MAINBOARD) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    // Silently return if card not found (UI behavior — don't throw)
    const found = findCardAcrossLists(deck, cardName)
    if (!found) return

    const result = removeCardFromDeck(deck, cardName, target)
    await get().updateDeck(result.deck)
  },

  updateCardInDeck: async (deckId, cardName, updates) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const updatedDeck = mapAllDeckEntries(deck, (entry: CardEntry) =>
      entry.card.name.toLowerCase() === cardName.toLowerCase()
        ? { ...entry, ...updates }
        : entry
    )
    await get().updateDeck(updatedDeck)
  },

  moveCard: async (deckId, cardName, from, to, quantity) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    try {
      const result = domainMoveCard(deck, cardName, from, to, quantity)
      await get().updateDeck(result.deck)
    } catch {
      // Silently fail in UI (card not found, etc.)
    }
  },
})
