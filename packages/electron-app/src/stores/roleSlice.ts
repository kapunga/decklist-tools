import type { DeckCard } from '@/types'
import type { RoleSlice, SliceCreator } from './types'

function updateCardInAllLists(
  deck: { cards: DeckCard[]; alternates: DeckCard[]; sideboard: DeckCard[] },
  cardName: string,
  updater: (card: DeckCard) => DeckCard
) {
  const updateList = (list: DeckCard[]): DeckCard[] =>
    list.map(c =>
      c.card.name.toLowerCase() === cardName.toLowerCase() ? updater(c) : c
    )
  return {
    cards: updateList(deck.cards),
    alternates: updateList(deck.alternates),
    sideboard: updateList(deck.sideboard),
  }
}

export const createRoleSlice: SliceCreator<RoleSlice> = (set, get) => ({
  addRoleToCard: async (deckId, cardName, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const updated = updateCardInAllLists(deck, cardName, c => ({
      ...c, roles: [...new Set([...c.roles, roleId])]
    }))
    await get().updateDeck({ ...deck, ...updated })
  },

  removeRoleFromCard: async (deckId, cardName, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const updated = updateCardInAllLists(deck, cardName, c => ({
      ...c, roles: c.roles.filter(r => r !== roleId)
    }))
    await get().updateDeck({ ...deck, ...updated })
  },

  setCardRoles: async (deckId, cardName, roles) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    const updated = updateCardInAllLists(deck, cardName, c => ({ ...c, roles }))
    await get().updateDeck({ ...deck, ...updated })
  },

  addCustomRole: async (deckId, role) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, customRoles: [...deck.customRoles, role] })
  },

  updateCustomRole: async (deckId, roleId, updates) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({
      ...deck,
      customRoles: deck.customRoles.map(r => r.id === roleId ? { ...r, ...updates } : r)
    })
  },

  removeCustomRole: async (deckId, roleId) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({
      ...deck,
      customRoles: deck.customRoles.filter(r => r.id !== roleId)
    })
  },

  addGlobalRole: async (role) => {
    const updatedRoles = [...get().globalRoles, role]
    await window.electronAPI.saveGlobalRoles(updatedRoles)
    set({ globalRoles: updatedRoles })
  },

  updateGlobalRole: async (roleId, updates) => {
    const updatedRoles = get().globalRoles.map(r =>
      r.id === roleId ? { ...r, ...updates } : r
    )
    await window.electronAPI.saveGlobalRoles(updatedRoles)
    set({ globalRoles: updatedRoles })
  },

  deleteGlobalRole: async (roleId) => {
    const updatedRoles = get().globalRoles.filter(r => r.id !== roleId)
    await window.electronAPI.saveGlobalRoles(updatedRoles)
    set({ globalRoles: updatedRoles })
  },
})
