import type { Deck, RoleDefinition } from '@mtg-deckbuilder/shared'
import { getRoleById, migrateDeckNote } from '@mtg-deckbuilder/shared'

export function renderNotesView(deck: Deck, globalRoles: RoleDefinition[]): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Notes)`)
  lines.push('')

  const notes = deck.notes.map(n => migrateDeckNote(n))

  if (notes.length === 0) {
    lines.push('*No notes yet*')
    return lines.join('\n')
  }

  for (const note of notes) {
    const typeBadge = `[${note.noteType.toUpperCase()}]`
    lines.push(`## ${typeBadge} ${note.title}`)

    if (note.roleId) {
      const role = getRoleById(note.roleId, globalRoles, deck.customRoles)
      lines.push(`**Role:** ${role?.name || note.roleId}`)
    }

    lines.push('')
    lines.push(note.content)
    lines.push('')

    if (note.cardRefs.length > 0) {
      lines.push('**Cards:**')
      for (const ref of note.cardRefs) {
        lines.push(`  ${ref.ordinal}. ${ref.cardName}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
