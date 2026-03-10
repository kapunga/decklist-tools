import { describe, it, expect } from 'vitest'
import { validateRole, validateRoles } from './role-validation.js'
import type { RoleDefinition } from '../types/index.js'

describe('validateRole', () => {
  it('accepts a valid role with all fields', () => {
    const role: RoleDefinition = {
      id: 'card-draw',
      name: 'Card Draw',
      description: 'Draws additional cards',
      color: '#3b82f6',
    }
    expect(validateRole(role)).toEqual([])
  })

  it('accepts a valid role with only required fields', () => {
    const role: RoleDefinition = { id: 'ramp', name: 'Ramp' }
    expect(validateRole(role)).toEqual([])
  })

  it('rejects a role with missing id', () => {
    const role = { id: '', name: 'Broken Role' } as RoleDefinition
    const errors = validateRole(role)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe('id')
  })

  it('rejects a role with missing name', () => {
    const role = { id: 'valid-id', name: '' } as RoleDefinition
    const errors = validateRole(role)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe('name')
  })

  it('rejects a role with whitespace-only name', () => {
    const role: RoleDefinition = { id: 'valid-id', name: '   ' }
    const errors = validateRole(role)
    expect(errors.some(e => e.field === 'name')).toBe(true)
  })

  it('rejects a role with invalid id characters', () => {
    const role: RoleDefinition = { id: 'Card Draw', name: 'Card Draw' }
    const errors = validateRole(role)
    expect(errors.some(e => e.field === 'id' && e.message.includes('invalid characters'))).toBe(true)
  })

  it('rejects a role with uppercase id', () => {
    const role: RoleDefinition = { id: 'CardDraw', name: 'Card Draw' }
    const errors = validateRole(role)
    expect(errors.some(e => e.field === 'id')).toBe(true)
  })

  it('rejects a role with empty color string', () => {
    const role: RoleDefinition = { id: 'ramp', name: 'Ramp', color: '' }
    const errors = validateRole(role)
    expect(errors.some(e => e.field === 'color')).toBe(true)
  })

  it('accepts a role with undefined color (optional field)', () => {
    const role: RoleDefinition = { id: 'ramp', name: 'Ramp', color: undefined }
    expect(validateRole(role)).toEqual([])
  })

  it('accepts a role with undefined description (optional field)', () => {
    const role: RoleDefinition = { id: 'ramp', name: 'Ramp', description: undefined }
    expect(validateRole(role)).toEqual([])
  })
})

describe('validateRoles', () => {
  it('accepts an empty array', () => {
    expect(validateRoles([])).toEqual([])
  })

  it('accepts an array of valid roles', () => {
    const roles: RoleDefinition[] = [
      { id: 'ramp', name: 'Ramp' },
      { id: 'card-draw', name: 'Card Draw' },
    ]
    expect(validateRoles(roles)).toEqual([])
  })

  it('detects duplicate role IDs', () => {
    const roles: RoleDefinition[] = [
      { id: 'ramp', name: 'Ramp' },
      { id: 'ramp', name: 'Ramp Duplicate' },
    ]
    const errors = validateRoles(roles)
    expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true)
  })

  it('reports errors from multiple invalid roles', () => {
    const roles: RoleDefinition[] = [
      { id: '', name: 'No ID' },
      { id: 'no-name', name: '' },
    ]
    const errors = validateRoles(roles)
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })

  it('catches a role created with broken focus (empty name, empty id from slugify)', () => {
    // Simulates what happens when the nested dialog bug prevents typing:
    // roleName is empty → slugify produces empty string → both id and name are empty
    const brokenRole = { id: '', name: '', description: undefined, color: '#ef4444' } as RoleDefinition
    const errors = validateRole(brokenRole)
    expect(errors.some(e => e.field === 'id')).toBe(true)
    expect(errors.some(e => e.field === 'name')).toBe(true)
  })
})
