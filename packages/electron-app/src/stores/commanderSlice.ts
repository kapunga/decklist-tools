import type { CommanderSlice, SliceCreator } from './types'

export const createCommanderSlice: SliceCreator<CommanderSlice> = (_set, get) => ({
  setCommanders: async (deckId, commanders) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({ ...deck, commanders })
  },

  addCommander: async (deckId, commander) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck || deck.commanders.length >= 2) return
    await get().updateDeck({ ...deck, commanders: [...deck.commanders, commander] })
  },

  removeCommander: async (deckId, commanderName) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return
    await get().updateDeck({
      ...deck,
      commanders: deck.commanders.filter(c => c.name.toLowerCase() !== commanderName.toLowerCase())
    })
  },
})
