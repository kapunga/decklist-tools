import type { DeckCard } from '@/types'
import { findCardByName, findCardIndexByName } from '@mtg-deckbuilder/shared'
import type { CardSlice, SliceCreator } from './types'

export const createCardSlice: SliceCreator<CardSlice> = (_set, get) => ({
  addCardToDeck: async (deckId, card, target = 'cards') => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const targetList = deck[target]
    const existingIndex = findCardIndexByName(targetList, card.card.name)

    let updatedList: DeckCard[]
    if (existingIndex >= 0) {
      updatedList = targetList.map((c, i) =>
        i === existingIndex
          ? { ...c, quantity: c.quantity + card.quantity }
          : c
      )
    } else {
      updatedList = [...targetList, card]
    }

    await get().updateDeck({ ...deck, [target]: updatedList })
  },

  removeCardFromDeck: async (deckId, cardName, target = 'cards') => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const index = findCardIndexByName(deck[target], cardName)
    if (index === -1) return

    await get().updateDeck({
      ...deck,
      [target]: deck[target].filter((_, i) => i !== index)
    })
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

    const card = findCardByName(deck[from], cardName)
    if (!card) return

    // Check if card already exists in target list
    const existingIndex = findCardIndexByName(deck[to], cardName)

    let updatedToList
    if (existingIndex >= 0) {
      // Merge with existing card
      updatedToList = deck[to].map((c, i) =>
        i === existingIndex
          ? {
              ...c,
              quantity: c.quantity + card.quantity,
              roles: [...new Set([...c.roles, ...card.roles])]
            }
          : c
      )
    } else {
      updatedToList = [...deck[to], card]
    }

    const fromIndex = findCardIndexByName(deck[from], cardName)
    await get().updateDeck({
      ...deck,
      [from]: deck[from].filter((_, i) => i !== fromIndex),
      [to]: updatedToList
    })
  },
})
