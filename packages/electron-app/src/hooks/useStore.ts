import { useMemo } from 'react'
import { create } from 'zustand'
import type { Deck, Taxonomy, CardList, Config, RoleDefinition, SetCollectionFile, PullListConfig } from '@/types'
import { getMainboard } from '@mtg-deckbuilder/shared'
import type { AppState } from '@/stores/types'
import { createDeckSlice } from '@/stores/deckSlice'
import { createCardSlice } from '@/stores/cardSlice'
import { createCommanderSlice } from '@/stores/commanderSlice'
import { createRoleSlice } from '@/stores/roleSlice'
import { createNoteSlice } from '@/stores/noteSlice'
import { createCardListsSlice } from '@/stores/cardListsSlice'
import { createConfigSlice } from '@/stores/configSlice'
import { createSelectionSlice } from '@/stores/selectionSlice'
import { createSetCollectionSlice } from '@/stores/setCollectionSlice'
import { createPullListSlice } from '@/stores/pullListSlice'
import { createUISlice } from '@/stores/uiSlice'

export type { AppView } from '@/stores/types'

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  decks: [],
  taxonomy: null,
  cardLists: [],
  config: null,
  globalRoles: [],
  setCollection: null,
  pullListConfig: null,
  selectedDeckId: null,
  selectedCardListId: null,
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
      const [decks, taxonomy, cardLists, config, globalRoles, setCollection, pullListConfig] = await Promise.all([
        window.electronAPI.listDecks(),
        window.electronAPI.getTaxonomy(),
        window.electronAPI.listCardLists(),
        window.electronAPI.getConfig(),
        window.electronAPI.getGlobalRoles(),
        window.electronAPI.getSetCollection(),
        window.electronAPI.getPullListConfig()
      ])
      set({
        decks: decks as Deck[],
        taxonomy: taxonomy as Taxonomy,
        cardLists: cardLists as CardList[],
        config: config as Config,
        globalRoles: globalRoles as RoleDefinition[],
        setCollection: setCollection as SetCollectionFile,
        pullListConfig: pullListConfig as PullListConfig,
        isLoading: false,
        hasInitialized: true,
        error: null
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

  selectCardList: (id) => {
    set({
      selectedCardListId: id,
      currentView: id ? 'list-detail' : 'lists',
      selectedCards: new Set<string>(),
      focusedCardId: null
    })
  },

  setView: (view) => {
    set({
      currentView: view,
      selectedDeckId: view === 'deck-detail' ? get().selectedDeckId : null,
      selectedCardListId: view === 'list-detail' ? get().selectedCardListId : null,
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
  ...createCardListsSlice(set, get),
  ...createConfigSlice(set, get),
  ...createSelectionSlice(set, get),
  ...createSetCollectionSlice(set, get),
  ...createPullListSlice(set, get),
  ...createUISlice(set, get),
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

  // Memoized so the returned array is referentially stable across renders
  // when `decks` is unchanged. Consumers depend on this in effect deps —
  // returning a fresh array each render caused a self-sustaining fetch loop
  // in BuyListView (price fetch → setState → rerender → new ref → refetch).
  return useMemo(() => {
    const buyMap = new Map<string, BuyListItem>()

    for (const deck of decks) {
      for (const card of getMainboard(deck)) {
        if (card.ownership === 'need_to_buy') {
          const key = card.card.name.toLowerCase()
          const existing = buyMap.get(key)
          const qty = card.quantity

          if (existing) {
            existing.totalQuantity += qty
            existing.decks.push({
              deckId: deck.id,
              deckName: deck.name,
              quantity: qty
            })
          } else {
            buyMap.set(key, {
              cardName: card.card.name,
              totalQuantity: qty,
              decks: [{
                deckId: deck.id,
                deckName: deck.name,
                quantity: qty
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
  }, [decks])
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
