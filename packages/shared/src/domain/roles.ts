import type { RoleDefinition, Deck, DeckNote, CardEntry } from '../types/index.js'
import { getAllDeckEntries, mapAllDeckEntries } from './card-sets.js'

/**
 * Add a role to a list. Returns a new array.
 * Throws if a role with the same ID already exists.
 */
export function addRoleToList(roles: RoleDefinition[], role: RoleDefinition): RoleDefinition[] {
  if (roles.some(r => r.id === role.id)) {
    throw new Error(`Role already exists: ${role.id}`)
  }
  return [...roles, role]
}

/**
 * Update a role's properties in a list.
 * Returns the new array and the updated role. Does not mutate the input.
 * Throws if role not found.
 */
export function updateRoleInList(
  roles: RoleDefinition[],
  roleId: string,
  updates: { name?: string; description?: string; color?: string }
): { updatedRoles: RoleDefinition[]; updatedRole: RoleDefinition } {
  const index = roles.findIndex(r => r.id === roleId)
  if (index === -1) throw new Error(`Role not found: ${roleId}`)

  const updatedRole: RoleDefinition = {
    ...roles[index],
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.color !== undefined && { color: updates.color }),
  }

  const updatedRoles = [...roles]
  updatedRoles[index] = updatedRole
  return { updatedRoles, updatedRole }
}

/**
 * Delete a role from a list. Returns the new array.
 * Does not mutate the input. Throws if role not found.
 */
export function deleteRoleFromList(roles: RoleDefinition[], roleId: string): RoleDefinition[] {
  const index = roles.findIndex(r => r.id === roleId)
  if (index === -1) throw new Error(`Role not found: ${roleId}`)
  return roles.filter((_, i) => i !== index)
}

/**
 * Give a note's role to every card the note references. Pure: referenced entries that
 * lack the role are replaced by copies that have it, every other entry keeps its
 * identity, and the deck itself is returned when there is nothing to add.
 */
export function withNoteRole(deck: Deck, note: DeckNote): Deck {
  const roleId = note.roleId
  if (!roleId) return deck

  const referenced = new Set(note.cardRefs.map(ref => ref.cardName.toLowerCase()))
  const lacksRole = (entry: CardEntry): boolean =>
    referenced.has(entry.card.name.toLowerCase()) && !(entry.roles ?? []).includes(roleId)

  if (!getAllDeckEntries(deck).some(lacksRole)) return deck
  return mapAllDeckEntries(deck, entry =>
    lacksRole(entry) ? { ...entry, roles: [...(entry.roles ?? []), roleId] } : entry
  )
}
