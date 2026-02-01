import type { InterestListSlice, SliceCreator } from './types'

export const createInterestListSlice: SliceCreator<InterestListSlice> = (set, get) => ({
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
})
