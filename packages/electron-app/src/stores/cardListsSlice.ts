import type { CardIdentifier, CardList, CardListKind, CardSource } from '@/types'
import {
  CARD_SET,
  CARD_SOURCE,
  CARD_LIST_KIND_DEFAULT_DESCRIPTIONS,
  getCardListEntries,
  withCardListEntries,
  makeCardEntry,
} from '@/types'
import type { CardListsSlice, SliceCreator } from './types'

function bumpVersion(list: CardList): CardList {
  return { ...list, version: list.version + 1 }
}

export const createCardListsSlice: SliceCreator<CardListsSlice> = (set, get) => {
  async function persist(list: CardList): Promise<void> {
    await window.electronAPI.saveCardList(list)
    const local = bumpVersion(list)
    const state = get()
    set({
      cardLists: state.cardLists.some(l => l.id === local.id)
        ? state.cardLists.map(l => (l.id === local.id ? local : l))
        : [...state.cardLists, local],
    })
  }

  function getList(id: string): CardList | undefined {
    return get().cardLists.find(l => l.id === id)
  }

  return {
    createCardList: async (input) => {
      const now = new Date().toISOString()
      const kind: CardListKind = input.kind ?? 'custom'
      const list: CardList = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? CARD_LIST_KIND_DEFAULT_DESCRIPTIONS[kind],
        kind,
        version: 0,
        createdAt: now,
        updatedAt: now,
        cardSets: [{ name: CARD_SET.MAINBOARD, entries: [] }],
      }
      await persist(list)
      return list
    },

    renameCardList: async (id, updates) => {
      const list = getList(id)
      if (!list) return
      const updated: CardList = {
        ...list,
        name: updates.name ?? list.name,
        description: updates.description ?? list.description,
      }
      await persist(updated)
    },

    deleteCardList: async (id) => {
      await window.electronAPI.deleteCardList(id)
      const state = get()
      set({ cardLists: state.cardLists.filter(l => l.id !== id) })
    },

    addCardToList: async (
      listId: string,
      card: CardIdentifier,
      notes?: string,
      source?: CardSource,
    ) => {
      const list = getList(listId)
      if (!list) return
      const entry = makeCardEntry({
        card,
        notes,
        source: source ?? CARD_SOURCE.USER,
      })
      await persist(withCardListEntries(list, [...getCardListEntries(list), entry]))
    },

    removeCardFromList: async (listId, cardName) => {
      const list = getList(listId)
      if (!list) return
      const filtered = getCardListEntries(list).filter(
        e => e.card.name.toLowerCase() !== cardName.toLowerCase(),
      )
      await persist(withCardListEntries(list, filtered))
    },

    updateCardInList: async (listId, cardName, updates) => {
      const list = getList(listId)
      if (!list) return
      const entries = getCardListEntries(list).map(e =>
        e.card.name.toLowerCase() === cardName.toLowerCase() ? { ...e, ...updates } : e,
      )
      await persist(withCardListEntries(list, entries))
    },

    addEntryToList: async (listId, entry) => {
      const list = getList(listId)
      if (!list) return
      await persist(withCardListEntries(list, [...getCardListEntries(list), entry]))
    },

    addEntriesToList: async (listId, entries) => {
      if (entries.length === 0) return
      const list = getList(listId)
      if (!list) return
      await persist(withCardListEntries(list, [...getCardListEntries(list), ...entries]))
    },
  }
}
