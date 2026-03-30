import { describe, it, expect } from 'vitest'
import { migrateDeckNote } from './index.js'

describe('migrateDeckNote', () => {
  it('fills in defaults for missing fields', () => {
    const note = migrateDeckNote({
      id: 'note-1',
      title: 'Test Note',
      content: 'Some content',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
    expect(note.noteType).toBe('general')
    expect(note.cardRefs).toEqual([])
  })

  it('preserves existing fields', () => {
    const note = migrateDeckNote({
      id: 'note-1',
      title: 'Combo Note',
      content: 'Combo description',
      noteType: 'combo',
      cardRefs: [{ cardName: 'Sol Ring', ordinal: 1 }],
      roleId: 'ramp',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
    expect(note.noteType).toBe('combo')
    expect(note.cardRefs).toHaveLength(1)
    expect(note.roleId).toBe('ramp')
  })
})
