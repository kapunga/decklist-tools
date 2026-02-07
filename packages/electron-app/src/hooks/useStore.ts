import { create } from 'zustand'
import type { Deck, Taxonomy, InterestList, Config, RoleDefinition, SetCollectionFile, PullListConfig } from '@/types'
import type { AppState } from '@/stores/types'
import { createDeckSlice } from '@/stores/deckSlice'
import { createCardSlice } from '@/stores/cardSlice'
import { createCommanderSlice } from '@/stores/commanderSlice'
import { createRoleSlice } from '@/stores/roleSlice'
import { createNoteSlice } from '@/stores/noteSlice'
import { createInterestListSlice } from '@/stores/interestListSlice'
import { createConfigSlice } from '@/stores/configSlice'
import { createSelectionSlice } from '@/stores/selectionSlice'
import { createSetCollectionSlice } from '@/stores/setCollectionSlice'
import { createPullListSlice } from '@/stores/pullListSlice'

export type { AppView } from '@/stores/types'

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  decks: [],
  taxonomy: null,
  interestList: null,
  config: null,
  globalRoles: [],
  setCollection: null,
  pullListConfig: null,
  selectedDeckId: null,
  currentView: 'decks',
  isLoading: false,
  hasInitialized: false,
  error: null,

  // Core actions
  loadData: async () => {
    const { hasInitialized } = get()
    if (!hasInitialized) {
      set({ isLoading: true, error: null })
    }
    try {
      const [decks, taxonomy, interestList, config, globalRoles, setCollection, pullListConfig] = await Promise.all([
        window.electronAPI.listDecks(),
        window.electronAPI.getTaxonomy(),
        window.electronAPI.getInterestList(),
        window.electronAPI.getConfig(),
        window.electronAPI.getGlobalRoles(),
        window.electronAPI.getSetCollection(),
        window.electronAPI.getPullListConfig()
      ])
      set({
        decks: decks as Deck[],
        taxonomy: taxonomy as Taxonomy,
        interestList: interestList as InterestList,
        config: config as Config,
        globalRoles: globalRoles as RoleDefinition[],
        setCollection: setCollection as SetCollectionFile,
        pullListConfig: pullListConfig as PullListConfig,
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
      selectedCards: new Set<string>(),
      focusedCardId: null
    })
  },

  setView: (view) => {
    set({
      currentView: view,
      selectedDeckId: view === 'deck-detail' ? get().selectedDeckId : null,
      selectedCards: new Set<string>(),
      focusedCardId: null
    })
  },

  // Slices
  ...createDeckSlice(set, get),
  ...createCardSlice(set, get),
  ...createCommanderSlice(set, get),
  ...createRoleSlice(set, get),
  ...createNoteSlice(set, get),
  ...createInterestListSlice(set, get),
  ...createConfigSlice(set, get),
  ...createSelectionSlice(set, get),
  ...createSetCollectionSlice(set, get),
  ...createPullListSlice(set, get),
}))

// Selector hooks
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

// Role hooks
import { getAllRoles, getRoleById as getRoleByIdHelper } from '@/lib/constants'

export const useAllRoles = (deckId: string | null): RoleDefinition[] => {
  const decks = useStore(state => state.decks)
  const globalRoles = useStore(state => state.globalRoles)
  const deck = deckId ? decks.find(d => d.id === deckId) : null
  return getAllRoles(globalRoles, deck?.customRoles)
}

export const useRoleById = (deckId: string | null, roleId: string): RoleDefinition | undefined => {
  const decks = useStore(state => state.decks)
  const globalRoles = useStore(state => state.globalRoles)
  const deck = deckId ? decks.find(d => d.id === deckId) : null
  return getRoleByIdHelper(roleId, globalRoles, deck?.customRoles)
}

export const useGlobalRoles = () => useStore(state => state.globalRoles)
