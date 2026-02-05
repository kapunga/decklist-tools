import type { DeckCard } from '@/types'
import type { CardSlice, SliceCreator } from './types'

export const createCardSlice: SliceCreator<CardSlice> = (_set, get) => ({
  addCardToDeck: async (deckId, card, target = 'cards') => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const targetList = deck[target]
    const existingIndex = targetList.findIndex(
      c => c.card.name.toLowerCase() === card.card.name.toLowerCase()
    )

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

    await get().updateDeck({
      ...deck,
      [target]: deck[target].filter(
        c => c.card.name.toLowerCase() !== cardName.toLowerCase()
      )
    })
  },

  updateCardInDeck: async (deckId, cardName, updates) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const updateList = (list: DeckCard[]): DeckCard[] =>
      list.map(c =>
        c.card.name.toLowerCase() === cardName.toLowerCase()
          ? { ...c, ...updates }
          : c
      )

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

    const card = deck[from].find(
      c => c.card.name.toLowerCase() === cardName.toLowerCase()
    )
    if (!card) return

    // Check if card already exists in target list
    const existingIndex = deck[to].findIndex(
      c => c.card.name.toLowerCase() === cardName.toLowerCase()
    )

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

    await get().updateDeck({
      ...deck,
      [from]: deck[from].filter(
        c => c.card.name.toLowerCase() !== cardName.toLowerCase()
      ),
      [to]: updatedToList
    })
  },
})
