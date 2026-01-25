import { create } from 'zustand'
import type { Deck, Taxonomy, InterestList, Config, DeckCard, CardIdentifier } from '@/types'
import { createEmptyDeck, formatDefaults } from '@/types'

interface AppState {
  // Data
  decks: Deck[]
  taxonomy: Taxonomy | null
  interestList: InterestList | null
  config: Config | null

  // UI State
  selectedDeckId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  loadData: () => Promise<void>
  selectDeck: (id: string | null) => void

  // Deck actions
  createDeck: (name: string, formatType: string) => Promise<Deck>
  updateDeck: (deck: Deck) => Promise<void>
  deleteDeck: (id: string) => Promise<void>

  // Card actions
  addCardToDeck: (deckId: string, card: DeckCard, target?: 'cards' | 'alternates' | 'sideboard') => Promise<void>
  removeCardFromDeck: (deckId: string, cardName: string, target?: 'cards' | 'alternates' | 'sideboard') => Promise<void>
  updateCardInDeck: (deckId: string, cardName: string, updates: Partial<DeckCard>) => Promise<void>
  moveCard: (deckId: string, cardName: string, from: 'cards' | 'alternates' | 'sideboard', to: 'cards' | 'alternates' | 'sideboard') => Promise<void>

  // Interest list actions
  addToInterestList: (card: CardIdentifier, notes?: string, source?: string) => Promise<void>
  removeFromInterestList: (cardName: string) => Promise<void>

  // Config actions
  updateConfig: (config: Partial<Config>) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  decks: [],
  taxonomy: null,
  interestList: null,
  config: null,
  selectedDeckId: null,
  isLoading: false,
  error: null,

  loadData: async () => {
    // Only show loading spinner on initial load, not on refresh
    const hasData = get().decks.length > 0
    if (!hasData) {
      set({ isLoading: true, error: null })
    }
    try {
      const [decks, taxonomy, interestList, config] = await Promise.all([
        window.electronAPI.listDecks(),
        window.electronAPI.getTaxonomy(),
        window.electronAPI.getInterestList(),
        window.electronAPI.getConfig()
      ])
      set({
        decks: decks as Deck[],
        taxonomy: taxonomy as Taxonomy,
        interestList: interestList as InterestList,
        config: config as Config,
        isLoading: false
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  selectDeck: (id) => {
    set({ selectedDeckId: id })
  },

  createDeck: async (name, formatType) => {
    const deck = createEmptyDeck(name, formatType as keyof typeof formatDefaults)
    await window.electronAPI.saveDeck(deck)
    set(state => ({ decks: [...state.decks, deck] }))
    return deck
  },

  updateDeck: async (deck) => {
    await window.electronAPI.saveDeck(deck)
    set(state => ({
      decks: state.decks.map(d => d.id === deck.id ? deck : d)
    }))
  },

  deleteDeck: async (id) => {
    await window.electronAPI.deleteDeck(id)
    set(state => ({
      decks: state.decks.filter(d => d.id !== id),
      selectedDeckId: state.selectedDeckId === id ? null : state.selectedDeckId
    }))
  },

  addCardToDeck: async (deckId, card, target = 'cards') => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
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

    const updatedDeck = { ...deck, [target]: updatedList }
    await get().updateDeck(updatedDeck)
  },

  removeCardFromDeck: async (deckId, cardName, target = 'cards') => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const updatedDeck = {
      ...deck,
      [target]: deck[target].filter(
        c => c.card.name.toLowerCase() !== cardName.toLowerCase()
      )
    }
    await get().updateDeck(updatedDeck)
  },

  updateCardInDeck: async (deckId, cardName, updates) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const updateList = (list: DeckCard[]): DeckCard[] =>
      list.map(c =>
        c.card.name.toLowerCase() === cardName.toLowerCase()
          ? { ...c, ...updates }
          : c
      )

    const updatedDeck = {
      ...deck,
      cards: updateList(deck.cards),
      alternates: updateList(deck.alternates),
      sideboard: updateList(deck.sideboard)
    }
    await get().updateDeck(updatedDeck)
  },

  moveCard: async (deckId, cardName, from, to) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const card = deck[from].find(
      c => c.card.name.toLowerCase() === cardName.toLowerCase()
    )
    if (!card) return

    const updatedDeck = {
      ...deck,
      [from]: deck[from].filter(
        c => c.card.name.toLowerCase() !== cardName.toLowerCase()
      ),
      [to]: [...deck[to], card]
    }
    await get().updateDeck(updatedDeck)
  },

  addToInterestList: async (card, notes, source) => {
    const state = get()
    if (!state.interestList) return

    const item = {
      id: crypto.randomUUID(),
      card,
      notes,
      source,
      addedAt: new Date().toISOString()
    }

    const updatedList = {
      ...state.interestList,
      items: [...state.interestList.items, item],
      version: state.interestList.version + 1
    }

    await window.electronAPI.saveInterestList(updatedList)
    set({ interestList: updatedList })
  },

  removeFromInterestList: async (cardName) => {
    const state = get()
    if (!state.interestList) return

    const updatedList = {
      ...state.interestList,
      items: state.interestList.items.filter(
        i => i.card.name.toLowerCase() !== cardName.toLowerCase()
      ),
      version: state.interestList.version + 1
    }

    await window.electronAPI.saveInterestList(updatedList)
    set({ interestList: updatedList })
  },

  updateConfig: async (updates) => {
    const state = get()
    if (!state.config) return

    const updatedConfig = { ...state.config, ...updates }
    await window.electronAPI.saveConfig(updatedConfig)
    set({ config: updatedConfig })
  }
}))

// Selector hooks for better performance
export const useSelectedDeck = () => {
  const selectedDeckId = useStore(state => state.selectedDeckId)
  const decks = useStore(state => state.decks)
  return decks.find(d => d.id === selectedDeckId) || null
}

export const useDeckById = (id: string | null) => {
  const decks = useStore(state => state.decks)
  return id ? decks.find(d => d.id === id) || null : null
}
