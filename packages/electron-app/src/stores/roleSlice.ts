import type { CardEntry, Deck } from '@/types'
import {
  addRoleToList,
  updateRoleInList,
  deleteRoleFromList,
  mapAllDeckEntries,
} from '@mtg-deckbuilder/shared'
import type { RoleSlice, SliceCreator } from './types'

function updateNamedCardInDeck(
  deck: Deck,
  cardName: string,
  updater: (card: CardEntry) => CardEntry
): Deck {
  const lower = cardName.toLowerCase()
  return mapAllDeckEntries(deck, c =>
    c.card.name.toLowerCase() === lower ? updater(c) : c
  )
}

export const createRoleSlice: SliceCreator<RoleSlice> = (set, get) => ({
  addRoleToCard: async (deckId, cardName, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const updated = updateNamedCardInDeck(deck, cardName, c => ({
      ...c, roles: [...new Set([...c.roles, roleId])]
    }))
    await get().updateDeck(updated)
  },

  removeRoleFromCard: async (deckId, cardName, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const updated = updateNamedCardInDeck(deck, cardName, c => ({
      ...c, roles: c.roles.filter(r => r !== roleId)
    }))
    await get().updateDeck(updated)
  },

  setCardRoles: async (deckId, cardName, roles) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const updated = updateNamedCardInDeck(deck, cardName, c => ({ ...c, roles }))
    await get().updateDeck(updated)
  },

  addCustomRole: async (deckId, role) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    try {
      await get().updateDeck({ ...deck, customRoles: addRoleToList(deck.customRoles, role) })
    } catch {
      // Duplicate role — silently fail in UI
    }
  },

  updateCustomRole: async (deckId, roleId, updates) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const { updatedRoles } = updateRoleInList(deck.customRoles, roleId, updates)
    await get().updateDeck({ ...deck, customRoles: updatedRoles })
  },

  removeCustomRole: async (deckId, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, customRoles: deleteRoleFromList(deck.customRoles, roleId) })
  },

  addGlobalRole: async (role) => {
    try {
      const updatedRoles = addRoleToList(get().globalRoles, role)
      await window.electronAPI.saveGlobalRoles(updatedRoles)
      set({ globalRoles: updatedRoles })
    } catch {
      // Duplicate role — silently fail in UI
    }
  },

  updateGlobalRole: async (roleId, updates) => {
    const { updatedRoles } = updateRoleInList(get().globalRoles, roleId, updates)
    await window.electronAPI.saveGlobalRoles(updatedRoles)
    set({ globalRoles: updatedRoles })
  },

  deleteGlobalRole: async (roleId) => {
    const updatedRoles = deleteRoleFromList(get().globalRoles, roleId)
    await window.electronAPI.saveGlobalRoles(updatedRoles)
    set({ globalRoles: updatedRoles })
  },
})
