import type { RoleDefinition } from '../types/index.js'

export function addRoleToList(_roles: RoleDefinition[], _role: RoleDefinition): RoleDefinition[] {
  throw new Error('Not yet implemented')
}

export function updateRoleInList(
  _roles: RoleDefinition[],
  _roleId: string,
  _updates: { name?: string; description?: string; color?: string }
): { updatedRoles: RoleDefinition[]; updatedRole: RoleDefinition } {
  throw new Error('Not yet implemented')
}

export function deleteRoleFromList(_roles: RoleDefinition[], _roleId: string): RoleDefinition[] {
  throw new Error('Not yet implemented')
}
