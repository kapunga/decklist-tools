import {
  Storage,
  type RoleDefinition,
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
      const roleIndex = roles.findIndex((r) => r.id === args.id)
      if (roleIndex === -1) throw new Error(`Role not found: ${args.id}`)

      if (args.name !== undefined) roles[roleIndex].name = args.name
      if (args.description !== undefined) roles[roleIndex].description = args.description
      if (args.color !== undefined) roles[roleIndex].color = args.color

      storage.saveGlobalRoles(roles)
      return { success: true, role: roles[roleIndex] }
    }
    case 'delete_global': {
      const roles = storage.getGlobalRoles()
      const roleIndex = roles.findIndex((r) => r.id === args.id)
      if (roleIndex === -1) throw new Error(`Role not found: ${args.id}`)

      roles.splice(roleIndex, 1)
      storage.saveGlobalRoles(roles)
      return { success: true, message: `Role ${args.id} deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}
