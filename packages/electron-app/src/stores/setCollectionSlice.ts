import type { SetCollectionSlice, SliceCreator } from './types'
import type { SetCollectionEntry, CollectionLevel } from '@/types'

export const createSetCollectionSlice: SliceCreator<SetCollectionSlice> = (set, get) => ({
  addSetToCollection: async (entry) => {
    const state = get()
    const collection = state.setCollection ?? { version: 1, updatedAt: '', sets: [] }

    // Check if set already exists
    if (collection.sets.some(s => s.setCode.toLowerCase() === entry.setCode.toLowerCase())) {
      throw new Error(`Set ${entry.setCode} is already in your collection`)
    }

    const newEntry: SetCollectionEntry = {
      ...entry,
      setCode: entry.setCode.toLowerCase(),
      addedAt: new Date().toISOString()
    }

    const updatedCollection = {
      ...collection,
      sets: [...collection.sets, newEntry]
    }

    await window.electronAPI.saveSetCollection(updatedCollection)
    set({ setCollection: updatedCollection })
  },

  updateSetInCollection: async (setCode: string, level: CollectionLevel) => {
    const state = get()
    if (!state.setCollection) return

    const updatedSets = state.setCollection.sets.map(s =>
      s.setCode.toLowerCase() === setCode.toLowerCase()
        ? { ...s, collectionLevel: level }
        : s
    )

    const updatedCollection = {
      ...state.setCollection,
      sets: updatedSets
    }

    await window.electronAPI.saveSetCollection(updatedCollection)
    set({ setCollection: updatedCollection })
  },

  removeSetFromCollection: async (setCode: string) => {
    const state = get()
    if (!state.setCollection) return

    const updatedSets = state.setCollection.sets.filter(
      s => s.setCode.toLowerCase() !== setCode.toLowerCase()
    )

    const updatedCollection = {
      ...state.setCollection,
      sets: updatedSets
    }

    await window.electronAPI.saveSetCollection(updatedCollection)
    set({ setCollection: updatedCollection })
  }
})
