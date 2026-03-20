import type { RoleDefinition } from '../types/index.js'

export interface RoleValidationError {
  roleId: string
  field: string
  message: string
}

/**
 * Validates a single role definition. Returns an array of errors (empty if valid).
 */
export function validateRole(role: RoleDefinition): RoleValidationError[] {
  const errors: RoleValidationError[] = []
  const id = role.id ?? ''

  if (!role.id || !role.id.trim()) {
    errors.push({ roleId: id, field: 'id', message: 'Role ID is missing or empty' })
  } else if (!/^[a-z0-9-]+$/.test(role.id)) {
    errors.push({ roleId: id, field: 'id', message: 'Role ID contains invalid characters (expected lowercase alphanumeric with hyphens)' })
  }

  if (!role.name || !role.name.trim()) {
    errors.push({ roleId: id, field: 'name', message: 'Role name is missing or empty' })
  }

  if (role.color !== undefined && role.color !== null) {
    if (typeof role.color !== 'string' || !role.color.trim()) {
      errors.push({ roleId: id, field: 'color', message: 'Role color is present but empty' })
    }
  }

  return errors
}

/**
 * Validates an array of role definitions. Returns all errors found.
 * Checks for individual role validity plus cross-role issues like duplicate IDs.
 */
export function validateRoles(roles: RoleDefinition[]): RoleValidationError[] {
  const errors: RoleValidationError[] = []

  // Validate each role individually
  for (const role of roles) {
    errors.push(...validateRole(role))
  }

  // Check for duplicate IDs
  const seen = new Map<string, number>()
  for (const role of roles) {
    if (role.id) {
      const count = (seen.get(role.id) ?? 0) + 1
      seen.set(role.id, count)
      if (count === 2) {
        errors.push({
          roleId: role.id,
          field: 'id',
          message: `Duplicate role ID: "${role.id}" appears multiple times`,
        })
      }
    }
  }

  return errors
}
