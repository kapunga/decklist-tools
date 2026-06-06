import type { PullListSlice, SliceCreator } from './types'
import type { PullListConfig, CardEntry, PulledPrinting } from '@/types'
import { OWNERSHIP_STATUS } from '@/types'
import { mapAllDeckEntries, getPulledPrintings } from '@mtg-deckbuilder/shared'

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

      await get().updateDeck(updatedDeck)
      return
    }

    const lowerName = cardName.toLowerCase()
    const updatedDeck = mapAllDeckEntries(deck, (card: CardEntry) => {
      if (card.card.name.toLowerCase() !== lowerName) return card

      const pulledPrintings = [...getPulledPrintings(card)]
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
        ownership: OWNERSHIP_STATUS.OWNED
      }
    })

    await get().updateDeck(updatedDeck)
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

      await get().updateDeck(updatedDeck)
      return
    }

    const lowerName = cardName.toLowerCase()
    const updatedDeck = mapAllDeckEntries(deck, (card: CardEntry) => {
      if (card.card.name.toLowerCase() !== lowerName) return card

      const pulledPrintings = getPulledPrintings(card)
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

      return {
        ...card,
        pulledPrintings: pulledPrintings.length > 0 ? pulledPrintings : undefined
      }
    })

    await get().updateDeck(updatedDeck)
  },

  resetPulledStatus: async (deckId) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const cleared = mapAllDeckEntries(deck, (card: CardEntry) => ({
      ...card,
      pulledPrintings: undefined
    }))
    const updatedDeck = {
      ...cleared,
      commandersPulled: undefined  // Also clear commander pulled status
    }

    await get().updateDeck(updatedDeck)
  }
})
