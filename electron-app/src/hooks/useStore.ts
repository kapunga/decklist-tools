import { create } from 'zustand'
import type { Deck, Taxonomy, InterestList, Config, DeckCard, CardIdentifier } from '@/types'
import { createEmptyDeck, formatDefaults } from '@/types'

export type AppView = 'decks' | 'deck-detail' | 'interest-list' | 'buy-list'

interface AppState {
  // Data
  decks: Deck[]
  taxonomy: Taxonomy | null
  interestList: InterestList | null
  config: Config | null

  // UI State
  selectedDeckId: string | null
  currentView: AppView
  isLoading: boolean
  hasInitialized: boolean
  error: string | null
  // Selection state for batch operations
  selectedCards: Set<string>  // Card names
  focusedCardId: string | null  // Scryfall ID of focused card

  // Actions
  loadData: () => Promise<void>
  selectDeck: (id: string | null) => void
  setView: (view: AppView) => void

  // Deck actions
  createDeck: (name: string, formatType: string) => Promise<Deck>
  updateDeck: (deck: Deck) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  setDeckArtCard: (deckId: string, scryfallId: string | undefined) => Promise<void>
  setDeckColorIdentity: (deckId: string, colors: string[]) => Promise<void>

  // Card actions
  addCardToDeck: (deckId: string, card: DeckCard, target?: 'cards' | 'alternates' | 'sideboard') => Promise<void>
  removeCardFromDeck: (deckId: string, cardName: string, target?: 'cards' | 'alternates' | 'sideboard') => Promise<void>
  updateCardInDeck: (deckId: string, cardName: string, updates: Partial<DeckCard>) => Promise<void>
  moveCard: (deckId: string, cardName: string, from: 'cards' | 'alternates' | 'sideboard', to: 'cards' | 'alternates' | 'sideboard') => Promise<void>

  // Interest list actions
  addToInterestList: (card: CardIdentifier, notes?: string, source?: string) => Promise<void>
  removeFromInterestList: (cardName: string) => Promise<void>
  updateInterestItem: (cardName: string, updates: { notes?: string; potentialDecks?: string[] }) => Promise<void>

  // Config actions
  updateConfig: (config: Partial<Config>) => Promise<void>

  // Selection actions
  selectCard: (cardName: string) => void
  deselectCard: (cardName: string) => void
  toggleCardSelection: (cardName: string) => void
  selectAllCards: (cardNames: string[]) => void
  clearSelection: () => void
  setFocusedCard: (cardId: string | null) => void

  // Batch actions
  batchUpdateOwnership: (deckId: string, cardNames: string[], ownership: DeckCard['ownership']) => Promise<void>
  batchRemoveCards: (deckId: string, cardNames: string[], listType: 'cards' | 'alternates' | 'sideboard') => Promise<void>
  batchMoveCards: (deckId: string, cardNames: string[], from: 'cards' | 'alternates' | 'sideboard', to: 'cards' | 'alternates' | 'sideboard') => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  decks: [],
  taxonomy: null,
  interestList: null,
  config: null,
  selectedDeckId: null,
  currentView: 'decks',
  isLoading: false,
  hasInitialized: false,  // Track if initial load is complete
  error: null,
  selectedCards: new Set<string>(),
  focusedCardId: null,

  loadData: async () => {
    // Only show loading spinner on very first app load, never on refreshes
    const { hasInitialized } = get()
    if (!hasInitialized) {
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
        isLoading: false,
        hasInitialized: true
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false, hasInitialized: true })
    }
  },

  selectDeck: (id) => {
    set({
      selectedDeckId: id,
      currentView: id ? 'deck-detail' : 'decks',
      // Clear selection when changing decks
      selectedCards: new Set<string>(),
      focusedCardId: null
    })
  },

  setView: (view) => {
    set({
      currentView: view,
      // Clear deck selection when navigating away from deck views
      selectedDeckId: view === 'deck-detail' ? get().selectedDeckId : null,
      // Clear selection when changing views
      selectedCards: new Set<string>(),
      focusedCardId: null
    })
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

  setDeckArtCard: async (deckId, scryfallId) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const updatedDeck = { ...deck, artCardScryfallId: scryfallId }
    await get().updateDeck(updatedDeck)
  },

  setDeckColorIdentity: async (deckId, colors) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const updatedDeck = { ...deck, colorIdentity: colors }
    await get().updateDeck(updatedDeck)
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

  updateInterestItem: async (cardName, updates) => {
    const state = get()
    if (!state.interestList) return

    const updatedList = {
      ...state.interestList,
      items: state.interestList.items.map(item =>
        item.card.name.toLowerCase() === cardName.toLowerCase()
          ? { ...item, ...updates }
          : item
      ),
      version: state.interestList.version + 1,
      updatedAt: new Date().toISOString()
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
  },

  // Selection actions
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

  // Batch actions
  batchUpdateOwnership: async (deckId, cardNames, ownership) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const updateList = (list: DeckCard[]): DeckCard[] =>
      list.map(c =>
        cardNames.includes(c.card.name)
          ? { ...c, ownership }
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

  batchRemoveCards: async (deckId, cardNames, listType) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const cardNamesLower = cardNames.map(n => n.toLowerCase())
    const updatedDeck = {
      ...deck,
      [listType]: deck[listType].filter(
        c => !cardNamesLower.includes(c.card.name.toLowerCase())
      )
    }
    await get().updateDeck(updatedDeck)
    // Clear selection after batch remove
    set({ selectedCards: new Set<string>() })
  },

  batchMoveCards: async (deckId, cardNames, from, to) => {
    const state = get()
    const deck = state.decks.find(d => d.id === deckId)
    if (!deck) return

    const cardNamesLower = cardNames.map(n => n.toLowerCase())
    const cardsToMove = deck[from].filter(
      c => cardNamesLower.includes(c.card.name.toLowerCase())
    )
    const remainingCards = deck[from].filter(
      c => !cardNamesLower.includes(c.card.name.toLowerCase())
    )

    const updatedDeck = {
      ...deck,
      [from]: remainingCards,
      [to]: [...deck[to], ...cardsToMove]
    }
    await get().updateDeck(updatedDeck)
    // Clear selection after batch move
    set({ selectedCards: new Set<string>() })
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

// Computed buy list from all decks
export interface BuyListItem {
  cardName: string
  totalQuantity: number
  decks: { deckId: string; deckName: string; quantity: number }[]
  scryfallId?: string
  setCode: string
  collectorNumber: string
}

export const useBuyList = (): BuyListItem[] => {
  const decks = useStore(state => state.decks)

  // Aggregate all need_to_buy cards across decks
  const buyMap = new Map<string, BuyListItem>()

  for (const deck of decks) {
    for (const card of deck.cards) {
      if (card.ownership === 'need_to_buy') {
        const key = card.card.name.toLowerCase()
        const existing = buyMap.get(key)

        if (existing) {
          existing.totalQuantity += card.quantity
          existing.decks.push({
            deckId: deck.id,
            deckName: deck.name,
            quantity: card.quantity
          })
        } else {
          buyMap.set(key, {
            cardName: card.card.name,
            totalQuantity: card.quantity,
            decks: [{
              deckId: deck.id,
              deckName: deck.name,
              quantity: card.quantity
            }],
            scryfallId: card.card.scryfallId,
            setCode: card.card.setCode,
            collectorNumber: card.card.collectorNumber
          })
        }
      }
    }
  }

  return Array.from(buyMap.values()).sort((a, b) =>
    a.cardName.localeCompare(b.cardName)
  )
}
