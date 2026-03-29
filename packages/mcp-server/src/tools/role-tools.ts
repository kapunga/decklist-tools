import {
  Storage,
  type RoleDefinition,
  addRoleToList,
  updateRoleInList,
  deleteRoleFromList,
} from '@mtg-deckbuilder/shared'
import { getDeckOrThrow } from './helpers.js'
import type { ManageRoleArgs } from './types.js'

export function listRoles(storage: Storage, deckId?: string) {
  const globalRoles = storage.getGlobalRoles()

  if (deckId) {
    const deck = storage.getDeck(deckId)
    if (deck) {
      return {
        global: globalRoles,
        custom: deck.customRoles,
      }
    }
  }

  return { global: globalRoles }
}

export function manageRole(storage: Storage, args: ManageRoleArgs) {
  switch (args.action) {
    case 'add_custom': {
      if (!args.deck_id) throw new Error('deck_id is required for add_custom')
      if (!args.name) throw new Error('name is required for add_custom')
      const deck = getDeckOrThrow(storage, args.deck_id)

      const role: RoleDefinition = {
        id: args.id,
        name: args.name,
        description: args.description,
        color: args.color,
      }
      deck.customRoles = addRoleToList(deck.customRoles, role)
      storage.saveDeck(deck)
      return { success: true, role }
    }
    case 'add_global': {
      if (!args.name) throw new Error('name is required for add_global')
      const role: RoleDefinition = {
        id: args.id,
        name: args.name,
        description: args.description,
        color: args.color,
      }
      const roles = storage.getGlobalRoles()
      storage.saveGlobalRoles(addRoleToList(roles, role))
      return { success: true, role }
    }
    case 'update_global': {
      const roles = storage.getGlobalRoles()
      const { updatedRoles, updatedRole } = updateRoleInList(roles, args.id, {
        name: args.name,
        description: args.description,
        color: args.color,
      })
      storage.saveGlobalRoles(updatedRoles)
      return { success: true, role: updatedRole }
    }
    case 'delete_global': {
      const roles = storage.getGlobalRoles()
      const updatedRoles = deleteRoleFromList(roles, args.id)
      storage.saveGlobalRoles(updatedRoles)
      return { success: true, message: `Role ${args.id} deleted` }
    }
    case 'update_custom': {
      if (!args.deck_id) throw new Error('deck_id is required for update_custom')
      const deck = getDeckOrThrow(storage, args.deck_id)
      const { updatedRoles, updatedRole } = updateRoleInList(deck.customRoles, args.id, {
        name: args.name,
        description: args.description,
        color: args.color,
      })
      deck.customRoles = updatedRoles
      storage.saveDeck(deck)
      return { success: true, role: updatedRole }
    }
    case 'delete_custom': {
      if (!args.deck_id) throw new Error('deck_id is required for delete_custom')
      const deck = getDeckOrThrow(storage, args.deck_id)
      deck.customRoles = deleteRoleFromList(deck.customRoles, args.id)
      storage.saveDeck(deck)
      return { success: true, message: `Role ${args.id} deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}
