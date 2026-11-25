import type { CardEntry } from '@/types'
import { CARD_SET } from '@/types'
import {
  addCardToDeck,
  removeCardFromDeck,
  moveCard as domainMoveCard,
  findCardAcrossLists,
  getAllDeckEntries,
  getCardLimit,
  mapAllDeckEntries,
} from '@mtg-deckbuilder/shared'
import { clampQuantity } from '@/lib/deckRows'
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

  adjustCardQuantity: async (deckId, cardId, delta) => {
    const deck = get().decks.find(d => d.id === deckId)
    const entry = deck && getAllDeckEntries(deck).find(e => e.id === cardId)
    if (!deck || !entry) return

    const quantity = clampQuantity(entry.quantity, delta, getCardLimit(entry.card.name, deck.format))
    if (quantity === entry.quantity) return

    await get().updateDeck(mapAllDeckEntries(deck, e => (e.id === cardId ? { ...e, quantity } : e)))
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
