import { describe, it, expect } from 'vitest'
import { addRoleToList, updateRoleInList, deleteRoleFromList, withNoteRole } from './roles.js'
import type { RoleDefinition, Deck, CardEntry, DeckNote } from '../types/index.js'

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

describe('withNoteRole', () => {
  const entry = (name: string, roles: string[] = []): CardEntry => ({
    id: `id-${name}`,
    card: { name, setCode: 'tst', collectorNumber: '1' },
    quantity: 1,
    roles,
    addedAt: '2026-01-01T00:00:00.000Z',
    source: 'user',
  } as CardEntry)

  const deckOf = (mainboard: CardEntry[], alternates: CardEntry[] = []): Deck => ({
    id: 'deck-1',
    cardSets: [
      { name: 'mainboard', entries: mainboard },
      { name: 'alternates', entries: alternates },
    ],
  } as unknown as Deck)

  const note = (cardNames: string[], roleId?: string): DeckNote => ({
    id: 'note-1',
    title: 'Combo',
    content: '',
    noteType: 'combo',
    cardRefs: cardNames.map((cardName, i) => ({ cardName, ordinal: i + 1 })),
    roleId,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as DeckNote)

  const deepFreeze = (deck: Deck): Deck => {
    deck.cardSets.forEach(set => {
      set.entries.forEach(e => { Object.freeze(e.roles); Object.freeze(e) })
      Object.freeze(set.entries)
      Object.freeze(set)
    })
    return Object.freeze(deck)
  }

  it('adds the role to every referenced entry, in any card set, matching names case-insensitively', () => {
    const deck = deckOf([entry('Sol Ring'), entry('Opt')], [entry('sol ring')])

    const result = withNoteRole(deck, note(['Sol Ring'], 'combo-piece'))

    expect(result.cardSets[0].entries[0].roles).toEqual(['combo-piece'])
    expect(result.cardSets[1].entries[0].roles).toEqual(['combo-piece'])
    expect(result.cardSets[0].entries[1].roles).toEqual([])
  })

  it('does not mutate its input', () => {
    const deck = deepFreeze(deckOf([entry('Sol Ring'), entry('Opt')]))

    const result = withNoteRole(deck, note(['Sol Ring'], 'combo-piece'))

    expect(deck.cardSets[0].entries[0].roles).toEqual([])
    expect(result.cardSets[0].entries[0]).not.toBe(deck.cardSets[0].entries[0])
  })

  it('keeps the identity of entries it does not touch', () => {
    const deck = deckOf([entry('Sol Ring'), entry('Opt')])

    const result = withNoteRole(deck, note(['Sol Ring'], 'combo-piece'))

    expect(result.cardSets[0].entries[1]).toBe(deck.cardSets[0].entries[1])
  })

  it('returns the same deck when the note carries no role', () => {
    const deck = deckOf([entry('Sol Ring')])

    expect(withNoteRole(deck, note(['Sol Ring']))).toBe(deck)
  })

  it('returns the same deck when every referenced entry already has the role', () => {
    const deck = deckOf([entry('Sol Ring', ['combo-piece'])])

    expect(withNoteRole(deck, note(['Sol Ring'], 'combo-piece'))).toBe(deck)
  })
})
