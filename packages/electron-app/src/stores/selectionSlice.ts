import type { DeckCard } from '@/types'
import type { SelectionSlice, SliceCreator } from './types'

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  selectedCards: new Set<string>(),
  focusedCardId: null,

  selectCard: (cardName) => {
    const newSet = new Set(get().selectedCards)
    newSet.add(cardName)
    set({ selectedCards: newSet })
  },

  deselectCard: (cardName) => {
    const newSet = new Set(get().selectedCards)
    newSet.delete(cardName)
    set({ selectedCards: newSet })
  },

  toggleCardSelection: (cardName) => {
    const newSet = new Set(get().selectedCards)
    if (newSet.has(cardName)) {
      newSet.delete(cardName)
    } else {
      newSet.add(cardName)
    }
    set({ selectedCards: newSet })
  },

  selectAllCards: (cardNames) => {
    set({ selectedCards: new Set(cardNames) })
  },

  clearSelection: () => {
    set({ selectedCards: new Set<string>() })
  },

  setFocusedCard: (cardId) => {
    set({ focusedCardId: cardId })
  },

  batchUpdateOwnership: async (deckId, cardNames, ownership) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const updateList = (list: DeckCard[]): DeckCard[] =>
      list.map(c =>
        cardNames.includes(c.card.name)
          ? { ...c, ownership }
          : c
      )

    await get().updateDeck({
      ...deck,
      cards: updateList(deck.cards),
      alternates: updateList(deck.alternates),
      sideboard: updateList(deck.sideboard)
    })
  },

  batchRemoveCards: async (deckId, cardNames, listType) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const cardNamesLower = cardNames.map(n => n.toLowerCase())
    await get().updateDeck({
      ...deck,
      [listType]: deck[listType].filter(
        c => !cardNamesLower.includes(c.card.name.toLowerCase())
      )
    })
    set({ selectedCards: new Set<string>() })
  },

  batchMoveCards: async (deckId, cardNames, from, to) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const cardNamesLower = cardNames.map(n => n.toLowerCase())
    const cardsToMove = deck[from].filter(
      c => cardNamesLower.includes(c.card.name.toLowerCase())
    )
    const remainingCards = deck[from].filter(
      c => !cardNamesLower.includes(c.card.name.toLowerCase())
    )

    await get().updateDeck({
      ...deck,
      [from]: remainingCards,
      [to]: [...deck[to], ...cardsToMove]
    })
    set({ selectedCards: new Set<string>() })
  },

  batchAddRoleToCards: async (deckId, cardNames, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const updateList = (list: DeckCard[]): DeckCard[] =>
      list.map(c =>
        cardNames.includes(c.card.name)
          ? { ...c, roles: [...new Set([...c.roles, roleId])] }
          : c
      )

    await get().updateDeck({
      ...deck,
      cards: updateList(deck.cards),
      alternates: updateList(deck.alternates),
      sideboard: updateList(deck.sideboard)
    })
  },
})
