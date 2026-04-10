import type { CardEntry } from '@/types'
import { mapAllDeckEntries, getCardSetEntries, withDeckCardSet } from '@mtg-deckbuilder/shared'
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

    const nameSet = new Set(cardNames)
    const updatedDeck = mapAllDeckEntries(deck, (c: CardEntry) =>
      nameSet.has(c.card.name) ? { ...c, ownership } : c
    )
    await get().updateDeck(updatedDeck)
    set({ selectedCards: new Set<string>() })
  },

  batchRemoveCards: async (deckId, cardNames, listType) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const cardNamesLower = cardNames.map(n => n.toLowerCase())
    const filtered = getCardSetEntries(deck.cardSets, listType).filter(
      c => !cardNamesLower.includes(c.card.name.toLowerCase())
    )
    await get().updateDeck(withDeckCardSet(deck, listType, filtered))
    set({ selectedCards: new Set<string>() })
  },

  batchMoveCards: async (deckId, cardNames, from, to) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const cardNamesLower = cardNames.map(n => n.toLowerCase())
    const fromEntries = getCardSetEntries(deck.cardSets, from)
    const cardsToMove = fromEntries.filter(
      c => cardNamesLower.includes(c.card.name.toLowerCase())
    )
    const remainingCards = fromEntries.filter(
      c => !cardNamesLower.includes(c.card.name.toLowerCase())
    )
    const toEntries = getCardSetEntries(deck.cardSets, to)

    let updatedDeck = withDeckCardSet(deck, from, remainingCards)
    updatedDeck = withDeckCardSet(updatedDeck, to, [...toEntries, ...cardsToMove])

    await get().updateDeck(updatedDeck)
    set({ selectedCards: new Set<string>() })
  },

  batchAddRoleToCards: async (deckId, cardNames, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const nameSet = new Set(cardNames)
    const updatedDeck = mapAllDeckEntries(deck, (c: CardEntry) =>
      nameSet.has(c.card.name)
        ? { ...c, roles: [...new Set([...c.roles, roleId])] }
        : c
    )
    await get().updateDeck(updatedDeck)
    set({ selectedCards: new Set<string>() })
  },
})
