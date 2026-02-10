import type { PullListSlice, SliceCreator } from './types'
import type { PullListConfig, DeckCard, PulledPrinting } from '@/types'

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
      showPulledSection: true,
      hideBasicLands: true,
      source: 'mainDeck' as const
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

    // Check if this is a commander
    const isCommander = deck.commanders.some(
      c => c.name.toLowerCase() === cardName.toLowerCase()
    )

    if (isCommander) {
      // Handle commander pulling separately
      const commandersPulled = [...(deck.commandersPulled ?? [])]
      const existingIndex = commandersPulled.findIndex(
        p => p.setCode.toLowerCase() === setCode.toLowerCase() &&
             p.collectorNumber === collectorNumber
      )

      if (existingIndex >= 0) {
        commandersPulled[existingIndex] = {
          ...commandersPulled[existingIndex],
          quantity: commandersPulled[existingIndex].quantity + quantity
        }
      } else {
        commandersPulled.push({
          setCode: setCode.toLowerCase(),
          collectorNumber,
          quantity
        })
      }

      const updatedDeck = {
        ...deck,
        commandersPulled
      }

      await window.electronAPI.saveDeck(updatedDeck)
      set({
        decks: state.decks.map(d => d.id === deckId ? updatedDeck : d)
      })
      return
    }

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

        // When pulling a card, also mark it as owned (removes from buylist)
        return {
          ...card,
          pulledPrintings,
          ownership: 'owned' as const
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

    // Check if this is a commander
    const isCommander = deck.commanders.some(
      c => c.name.toLowerCase() === cardName.toLowerCase()
    )

    if (isCommander) {
      // Handle commander unpulling separately
      const commandersPulled = (deck.commandersPulled ?? [])
        .map((p: PulledPrinting) => {
          if (p.setCode.toLowerCase() === setCode.toLowerCase() &&
              p.collectorNumber === collectorNumber) {
            return {
              ...p,
              quantity: Math.max(0, p.quantity - quantity)
            }
          }
          return p
        })
        .filter((p: PulledPrinting) => p.quantity > 0)

      const updatedDeck = {
        ...deck,
        commandersPulled: commandersPulled.length > 0 ? commandersPulled : undefined
      }

      await window.electronAPI.saveDeck(updatedDeck)
      set({
        decks: state.decks.map(d => d.id === deckId ? updatedDeck : d)
      })
      return
    }

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
      sideboard: clearPulled(deck.sideboard),
      commandersPulled: undefined  // Also clear commander pulled status
    }

    await window.electronAPI.saveDeck(updatedDeck)
    set({
      decks: state.decks.map(d => d.id === deckId ? updatedDeck : d)
    })
  }
})
