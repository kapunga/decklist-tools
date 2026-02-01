import {
  Storage,
  type Deck,
  type DeckCard,
  type DeckNote,
  type NoteCardRef,
  generateDeckCardId,
  propagateNoteRole,
} from '@mtg-deckbuilder/shared'
import { getDeckOrThrow } from './helpers.js'
import type { ManageDeckNoteArgs } from './types.js'

export function listDeckNotes(storage: Storage, deckId: string) {
  const deck = getDeckOrThrow(storage, deckId)

  return deck.notes.map(n => ({
    id: n.id,
    title: n.title,
    noteType: n.noteType,
    cardRefs: n.cardRefs,
    roleId: n.roleId,
    content: n.content,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }))
}

export function manageDeckNote(storage: Storage, args: ManageDeckNoteArgs) {
  const deck = getDeckOrThrow(storage, args.deck_id)

  switch (args.action) {
    case 'add': {
      if (!args.title) throw new Error('title is required for add')
      if (!args.content) throw new Error('content is required for add')
      if (!args.note_type) throw new Error('note_type is required for add')

      const now = new Date().toISOString()
      const cardRefs: NoteCardRef[] = (args.card_names || []).map((name, i) => ({
        cardName: name,
        ordinal: i + 1,
      }))

      const note: DeckNote = {
        id: generateDeckCardId(),
        title: args.title,
        content: args.content,
        noteType: args.note_type,
        cardRefs,
        roleId: args.role_id,
        createdAt: now,
        updatedAt: now,
      }

      deck.notes.push(note)
      propagateNoteRole(deck, note)
      storage.saveDeck(deck)
      return { success: true, note }
    }
    case 'update': {
      if (!args.note_id) throw new Error('note_id is required for update')
      const note = deck.notes.find(n => n.id === args.note_id)
      if (!note) throw new Error(`Note not found: ${args.note_id}`)

      if (args.remove_role && note.roleId) {
        removeRoleFromNoteCards(deck, note)
      }

      if (args.title !== undefined) note.title = args.title
      if (args.content !== undefined) note.content = args.content
      if (args.note_type !== undefined) note.noteType = args.note_type
      if (args.card_names !== undefined) {
        note.cardRefs = args.card_names.map((name, i) => ({ cardName: name, ordinal: i + 1 }))
      }
      if (args.role_id !== undefined) note.roleId = args.role_id || undefined
      note.updatedAt = new Date().toISOString()

      propagateNoteRole(deck, note)
      storage.saveDeck(deck)
      return { success: true, note }
    }
    case 'delete': {
      if (!args.note_id) throw new Error('note_id is required for delete')
      const noteIndex = deck.notes.findIndex(n => n.id === args.note_id)
      if (noteIndex === -1) throw new Error(`Note not found: ${args.note_id}`)

      const note = deck.notes[noteIndex]
      if (args.remove_role && note.roleId) {
        removeRoleFromNoteCards(deck, note)
      }

      deck.notes.splice(noteIndex, 1)
      storage.saveDeck(deck)
      return { success: true, message: `Note "${note.title}" deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

function removeRoleFromNoteCards(deck: Deck, note: DeckNote): void {
  if (!note.roleId) return
  const refNames = new Set(note.cardRefs.map(r => r.cardName.toLowerCase()))
  const removeRole = (cards: DeckCard[]) => {
    for (const card of cards) {
      if (refNames.has(card.card.name.toLowerCase())) {
        card.roles = card.roles.filter(r => r !== note.roleId)
      }
    }
  }
  removeRole(deck.cards)
  removeRole(deck.alternates)
  removeRole(deck.sideboard)
}
