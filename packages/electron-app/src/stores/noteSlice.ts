import type { DeckCard, DeckNote } from '@/types'
import { propagateNoteRole } from '@/types'
import type { NoteSlice, SliceCreator } from './types'

export const createNoteSlice: SliceCreator<NoteSlice> = (_set, get) => ({
  addNote: async (deckId, noteData) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const now = new Date().toISOString()
    const note: DeckNote = {
      ...noteData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    const updatedDeck = { ...deck, notes: [...deck.notes, note] }
    propagateNoteRole(updatedDeck, note)
    await get().updateDeck(updatedDeck)
  },

  updateNote: async (deckId, noteId, updates) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const updatedNotes = deck.notes.map(n =>
      n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    )
    const updatedDeck = { ...deck, notes: updatedNotes }

    const updatedNote = updatedDeck.notes.find(n => n.id === noteId)
    if (updatedNote) {
      propagateNoteRole(updatedDeck, updatedNote)
    }

    await get().updateDeck(updatedDeck)
  },

  deleteNote: async (deckId, noteId, removeRole = false) => {
    const deck = get().decks.find(d => d.id === deckId)
    if (!deck) return

    const note = deck.notes.find(n => n.id === noteId)
    let updatedDeck = { ...deck, notes: deck.notes.filter(n => n.id !== noteId) }

    if (removeRole && note?.roleId) {
      const refNames = new Set(note.cardRefs.map(r => r.cardName.toLowerCase()))
      const removeRoleFromList = (cards: DeckCard[]): DeckCard[] =>
        cards.map(c =>
          refNames.has(c.card.name.toLowerCase())
            ? { ...c, roles: c.roles.filter(r => r !== note.roleId) }
            : c
        )
      updatedDeck = {
        ...updatedDeck,
        cards: removeRoleFromList(updatedDeck.cards),
        alternates: removeRoleFromList(updatedDeck.alternates),
        sideboard: removeRoleFromList(updatedDeck.sideboard),
      }
    }

    await get().updateDeck(updatedDeck)
  },
})
