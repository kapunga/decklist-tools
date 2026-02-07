import type { PullListSlice, SliceCreator } from './types'
import type { PullListConfig, DeckCard } from '@/types'

export const createPullListSlice: SliceCreator<PullListSlice> = (set, get) => ({
  loadPullListConfig: async () => {
    const config = await window.electronAPI.getPullListConfig()
    set({ pullListConfig: config as PullListConfig })
  },

  updatePullListConfig: async (updates) => {
    const state = get()
    const current = state.pullListConfig ?? {
      version: 1,
      updatedAt: '',
      sortColumns: ['rarity', 'type', 'manaCost', 'name'] as const,
      showPulledSection: true
    }

    const updated: PullListConfig = {
      ...current,
      ...updates
    }

    await window.electronAPI.savePullListConfig(updated)
    set({ pullListConfig: updated })
  },

  pullCards: async (deckId, cardName, setCode, collectorNumber, quantity) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    // Find card in all lists
    const findAndUpdateCard = (cards: DeckCard[]): DeckCard[] => {
      return cards.map(card => {
        if (card.card.name.toLowerCase() !== cardName.toLowerCase()) {
          return card
        }

        const pulledPrintings = [...(card.pulledPrintings ?? [])]
        const existingIndex = pulledPrintings.findIndex(
          p => p.setCode.toLowerCase() === setCode.toLowerCase() &&
               p.collectorNumber === collectorNumber
        )

        if (existingIndex >= 0) {
          pulledPrintings[existingIndex] = {
            ...pulledPrintings[existingIndex],
            quantity: pulledPrintings[existingIndex].quantity + quantity
          }
        } else {
          pulledPrintings.push({
            setCode: setCode.toLowerCase(),
            collectorNumber,
            quantity
          })
        }

        return {
          ...card,
          pulledPrintings
        }
      })
    }

    const updatedDeck = {
      ...deck,
      cards: findAndUpdateCard(deck.cards),
      alternates: findAndUpdateCard(deck.alternates),
      sideboard: findAndUpdateCard(deck.sideboard)
    }

    await window.electronAPI.saveDeck(updatedDeck)
    set({
      decks: state.decks.map(d => d.id === deckId ? updatedDeck : d)
    })
  },

  unpullCards: async (deckId, cardName, setCode, collectorNumber, quantity) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const findAndUpdateCard = (cards: DeckCard[]): DeckCard[] => {
      return cards.map(card => {
        if (card.card.name.toLowerCase() !== cardName.toLowerCase()) {
          return card
        }

        const pulledPrintings = (card.pulledPrintings ?? [])
          .map((p: { setCode: string; collectorNumber: string; quantity: number }) => {
            if (p.setCode.toLowerCase() === setCode.toLowerCase() &&
                p.collectorNumber === collectorNumber) {
              return {
                ...p,
                quantity: Math.max(0, p.quantity - quantity)
              }
            }
            return p
          })
          .filter((p: { quantity: number }) => p.quantity > 0)

        return {
          ...card,
          pulledPrintings: pulledPrintings.length > 0 ? pulledPrintings : undefined
        }
      })
    }

    const updatedDeck = {
      ...deck,
      cards: findAndUpdateCard(deck.cards),
      alternates: findAndUpdateCard(deck.alternates),
      sideboard: findAndUpdateCard(deck.sideboard)
    }

    await window.electronAPI.saveDeck(updatedDeck)
    set({
      decks: state.decks.map(d => d.id === deckId ? updatedDeck : d)
    })
  },

  resetPulledStatus: async (deckId) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const clearPulled = (cards: DeckCard[]): DeckCard[] => {
      return cards.map(card => ({
        ...card,
        pulledPrintings: undefined
      }))
    }

    const updatedDeck = {
      ...deck,
      cards: clearPulled(deck.cards),
      alternates: clearPulled(deck.alternates),
      sideboard: clearPulled(deck.sideboard)
    }

    await window.electronAPI.saveDeck(updatedDeck)
    set({
      decks: state.decks.map(d => d.id === deckId ? updatedDeck : d)
    })
  }
})
