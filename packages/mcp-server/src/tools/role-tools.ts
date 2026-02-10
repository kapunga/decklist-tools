import {
  Storage,
  type RoleDefinition,
} from '@mtg-deckbuilder/shared'
import { getDeckOrThrow, updateRoleInList, deleteRoleFromList } from './helpers.js'
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
      if (!args.id) throw new Error('id is required for add_custom')
      if (!args.name) throw new Error('name is required for add_custom')
      const deck = getDeckOrThrow(storage, args.deck_id)

      if (deck.customRoles.some((r) => r.id === args.id)) {
        throw new Error(`Role already exists: ${args.id}`)
      }

      const role: RoleDefinition = {
        id: args.id,
        name: args.name,
        description: args.description,
        color: args.color,
      }
      deck.customRoles.push(role)
      storage.saveDeck(deck)
      return { success: true, role }
    }
    case 'add_global': {
      if (!args.id) throw new Error('id is required for add_global')
      if (!args.name) throw new Error('name is required for add_global')
      const roles = storage.getGlobalRoles()
      if (roles.some((r) => r.id === args.id)) {
        throw new Error(`Role already exists: ${args.id}`)
      }

      const role: RoleDefinition = {
        id: args.id,
        name: args.name,
        description: args.description,
        color: args.color,
      }
      roles.push(role)
      storage.saveGlobalRoles(roles)
      return { success: true, role }
    }
    case 'update_global': {
      const roles = storage.getGlobalRoles()
      const role = updateRoleInList(roles, args.id!, {
        name: args.name,
        description: args.description,
        color: args.color,
      })
      storage.saveGlobalRoles(roles)
      return { success: true, role }
    }
    case 'delete_global': {
      const roles = storage.getGlobalRoles()
      const deletedId = deleteRoleFromList(roles, args.id!)
      storage.saveGlobalRoles(roles)
      return { success: true, message: `Role ${deletedId} deleted` }
    }
    case 'update_custom': {
      if (!args.deck_id) throw new Error('deck_id is required for update_custom')
      if (!args.id) throw new Error('id is required for update_custom')
      const deck = getDeckOrThrow(storage, args.deck_id)
      const role = updateRoleInList(deck.customRoles, args.id, {
        name: args.name,
        description: args.description,
        color: args.color,
      })
      storage.saveDeck(deck)
      return { success: true, role }
    }
    case 'delete_custom': {
      if (!args.deck_id) throw new Error('deck_id is required for delete_custom')
      if (!args.id) throw new Error('id is required for delete_custom')
      const deck = getDeckOrThrow(storage, args.deck_id)
      const deletedId = deleteRoleFromList(deck.customRoles, args.id)
      storage.saveDeck(deck)
      return { success: true, message: `Role ${deletedId} deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}
