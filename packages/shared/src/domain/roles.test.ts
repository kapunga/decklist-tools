import { describe, it, expect } from 'vitest'
import { addRoleToList, updateRoleInList, deleteRoleFromList } from './roles.js'
import type { RoleDefinition } from '../types/index.js'

const ramp: RoleDefinition = { id: 'ramp', name: 'Ramp' }
const draw: RoleDefinition = { id: 'card-draw', name: 'Card Draw' }

describe('addRoleToList', () => {
  it('adds a role', () => {
    const result = addRoleToList([], ramp)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ramp')
  })

  it('throws on duplicate', () => {
    expect(() => addRoleToList([ramp], ramp)).toThrow('Role already exists')
  })

  it('does not mutate the input', () => {
    const original = [ramp]
    addRoleToList(original, draw)
    expect(original).toHaveLength(1)
  })
})

describe('updateRoleInList', () => {
  it('updates name', () => {
    const { updatedRoles, updatedRole } = updateRoleInList([ramp], 'ramp', { name: 'Mana Ramp' })
    expect(updatedRole.name).toBe('Mana Ramp')
    expect(updatedRoles[0].name).toBe('Mana Ramp')
  })

  it('updates description and color', () => {
    const { updatedRole } = updateRoleInList([ramp], 'ramp', { description: 'New desc', color: '#ff0000' })
    expect(updatedRole.description).toBe('New desc')
    expect(updatedRole.color).toBe('#ff0000')
  })

  it('throws when not found', () => {
    expect(() => updateRoleInList([], 'nope', { name: 'X' })).toThrow('Role not found')
  })

  it('does not mutate the input', () => {
    const original = [{ ...ramp }]
    updateRoleInList(original, 'ramp', { name: 'Changed' })
    expect(original[0].name).toBe('Ramp')
  })
})

describe('deleteRoleFromList', () => {
  it('deletes a role', () => {
    const result = deleteRoleFromList([ramp, draw], 'ramp')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('card-draw')
  })

  it('throws when not found', () => {
    expect(() => deleteRoleFromList([], 'nope')).toThrow('Role not found')
  })

  it('does not mutate the input', () => {
    const original = [ramp, draw]
    deleteRoleFromList(original, 'ramp')
    expect(original).toHaveLength(2)
  })
})
