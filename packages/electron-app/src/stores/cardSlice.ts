import type { DeckCard } from '@/types'
import { DECK_LIST } from '@/types'
import {
  addCardToDeck,
  removeCardFromDeck,
  moveCard as domainMoveCard,
  findCardAcrossLists,
} from '@mtg-deckbuilder/shared'
import { findCardIndexByName } from '@mtg-deckbuilder/shared'
import type { CardSlice, SliceCreator } from './types'

export const createCardSlice: SliceCreator<CardSlice> = (_set, get) => ({
  addCardToDeck: async (deckId, card, target = DECK_LIST.MAINBOARD) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const result = addCardToDeck(deck, card, target)
    await get().updateDeck(result.deck)
  },

  removeCardFromDeck: async (deckId, cardName, target = DECK_LIST.MAINBOARD) => {
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

    const updateList = (list: DeckCard[]): DeckCard[] => {
      const index = findCardIndexByName(list, cardName)
      if (index === -1) return list
      return list.map((c, i) => i === index ? { ...c, ...updates } : c)
    }

    await get().updateDeck({
      ...deck,
      cards: updateList(deck.cards),
      alternates: updateList(deck.alternates),
      sideboard: updateList(deck.sideboard)
    })
  },

  moveCard: async (deckId, cardName, from, to) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    try {
      const result = domainMoveCard(deck, cardName, from, to)
      await get().updateDeck(result.deck)
    } catch {
      // Silently fail in UI (card not found, etc.)
    }
  },
})
