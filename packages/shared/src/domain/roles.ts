import type { RoleDefinition } from '../types/index.js'

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
