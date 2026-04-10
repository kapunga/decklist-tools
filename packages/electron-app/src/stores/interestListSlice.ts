import type { CardEntry, CardList } from '@/types'
import { INTEREST_LIST_ID, CARD_SET, CARD_SOURCE } from '@/types'
import type { InterestListSlice, SliceCreator } from './types'

function findInterestList(cardLists: CardList[]): CardList | undefined {
  return cardLists.find(l => l.id === INTEREST_LIST_ID)
}

function createEmptyInterestList(): CardList {
  const now = new Date().toISOString()
  return {
    id: INTEREST_LIST_ID,
    name: 'Interest List',
    version: 0,
    createdAt: now,
    updatedAt: now,
    cardSets: [{ name: CARD_SET.MAINBOARD, entries: [] }],
  }
}

function getMainEntries(list: CardList): CardEntry[] {
  return list.cardSets[0]?.entries ?? []
}

function withMainEntries(list: CardList, entries: CardEntry[]): CardList {
  const setName = list.cardSets[0]?.name ?? CARD_SET.MAINBOARD
  return { ...list, cardSets: [{ name: setName, entries }] }
}

export const createInterestListSlice: SliceCreator<InterestListSlice> = (set, get) => ({
  addToInterestList: async (card, notes, source) => {
    const state = get()
    const existing = findInterestList(state.cardLists) ?? createEmptyInterestList()

    const entry: CardEntry = {
      id: crypto.randomUUID(),
      card,
      notes,
      source: source ?? CARD_SOURCE.USER,
      addedAt: new Date().toISOString(),
    }

    const updated = withMainEntries(existing, [...getMainEntries(existing), entry])
    await window.electronAPI.saveCardList(updated)

    // Bump version locally to mirror server-side increment
    const localUpdated: CardList = { ...updated, version: updated.version + 1 }
    set({
      cardLists: state.cardLists.some(l => l.id === INTEREST_LIST_ID)
        ? state.cardLists.map(l => l.id === INTEREST_LIST_ID ? localUpdated : l)
        : [...state.cardLists, localUpdated],
    })
  },

  removeFromInterestList: async (cardName) => {
    const state = get()
    const existing = findInterestList(state.cardLists)
    if (!existing) return

    const entries = getMainEntries(existing)
    const filtered = entries.filter(i => i.card.name.toLowerCase() !== cardName.toLowerCase())
    const updated = withMainEntries(existing, filtered)

    await window.electronAPI.saveCardList(updated)
    const localUpdated: CardList = { ...updated, version: updated.version + 1 }
    set({
      cardLists: state.cardLists.map(l => l.id === INTEREST_LIST_ID ? localUpdated : l),
    })
  },

  updateInterestItem: async (cardName, updates) => {
    const state = get()
    const existing = findInterestList(state.cardLists)
    if (!existing) return

    const entries = getMainEntries(existing).map(item =>
      item.card.name.toLowerCase() === cardName.toLowerCase()
        ? { ...item, ...updates }
        : item
    )
    const updated = withMainEntries(existing, entries)

    await window.electronAPI.saveCardList(updated)
    const localUpdated: CardList = { ...updated, version: updated.version + 1 }
    set({
      cardLists: state.cardLists.map(l => l.id === INTEREST_LIST_ID ? localUpdated : l),
    })
  },
})
