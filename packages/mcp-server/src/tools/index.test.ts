import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockStorage, mockScryfallCard, makeDeck, makeDeckCard } from '../__test__/helpers.js'
import { handleToolCall, getToolDefinitions } from './index.js'
import type { Storage } from '@mtg-deckbuilder/shared'

// Mock only the Scryfall functions
vi.mock('@mtg-deckbuilder/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mtg-deckbuilder/shared')>()
  return {
    ...actual,
    searchCardByName: vi.fn(),
    getCardBySetAndNumber: vi.fn(),
  }
})

import { searchCardByName, getCardBySetAndNumber } from '@mtg-deckbuilder/shared'
const mockSearchCardByName = vi.mocked(searchCardByName)
const mockGetCardBySetAndNumber = vi.mocked(getCardBySetAndNumber)

let storage: Storage
let mock: ReturnType<typeof createMockStorage>

beforeEach(() => {
  vi.clearAllMocks()
  mock = createMockStorage()
  storage = mock.storage
})

// Helper to call a tool
function call(name: string, args: Record<string, unknown> = {}) {
  return handleToolCall(name, args, storage)
}

// ─── Tool Definitions ──────────────────────────────────────────

describe('getToolDefinitions', () => {
  it('returns 31 tools', () => {
    expect(getToolDefinitions()).toHaveLength(31)
  })
})

// ─── Deck CRUD ─────────────────────────────────────────────────

describe('Deck CRUD', () => {
  describe('list_decks', () => {
    it('returns empty list when no decks', async () => {
      expect(await call('list_decks')).toEqual([])
    })

    it('returns deck summaries', async () => {
      const deck = makeDeck({ name: 'My Deck' })
      mock._decks.set(deck.id, deck)
      const result = await call('list_decks') as any[]
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('My Deck')
      expect(result[0].format).toBe('commander')
    })
  })

  describe('create_deck', () => {
    it('creates a deck with valid format', async () => {
      const result = await call('create_deck', { name: 'New Deck', format: 'commander' }) as any
      expect(result.name).toBe('New Deck')
      expect(result.format).toBe('commander')
      expect((storage.saveDeck as any).mock.calls).toHaveLength(1)
    })

    it('throws on invalid format', async () => {
      await expect(call('create_deck', { name: 'Bad', format: 'vintage' }))
        .rejects.toThrow('Invalid format')
    })

    it('sets optional fields', async () => {
      await call('create_deck', {
        name: 'Deck', format: 'standard', archetype: 'Aggro', description: 'Fast'
      })
      const saved = (storage.saveDeck as any).mock.calls[0][0]
      expect(saved.archetype).toBe('Aggro')
      expect(saved.description).toBe('Fast')
    })
  })

  describe('get_deck', () => {
    it('gets deck by id', async () => {
      const deck = makeDeck({ name: 'Found' })
      mock._decks.set(deck.id, deck)
      const result = await call('get_deck', { identifier: deck.id }) as any
      expect(result.name).toBe('Found')
    })

    it('gets deck by name', async () => {
      const deck = makeDeck({ name: 'Found By Name' })
      mock._decks.set(deck.id, deck)
      const result = await call('get_deck', { identifier: 'Found By Name' }) as any
      expect(result.name).toBe('Found By Name')
    })

    it('throws when not found', async () => {
      await expect(call('get_deck', { identifier: 'nope' })).rejects.toThrow('Deck not found')
    })
  })

  describe('update_deck_metadata', () => {
    it('updates name', async () => {
      const deck = makeDeck({ name: 'Old' })
      mock._decks.set(deck.id, deck)
      await call('update_deck_metadata', { deck_id: deck.id, name: 'New' })
      expect(deck.name).toBe('New')
    })

    it('throws when deck not found', async () => {
      await expect(call('update_deck_metadata', { deck_id: 'nope' })).rejects.toThrow('Deck not found')
    })
  })

  describe('delete_deck', () => {
    it('deletes existing deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      const result = await call('delete_deck', { deck_id: deck.id }) as any
      expect(result.success).toBe(true)
    })

    it('throws when not found', async () => {
      await expect(call('delete_deck', { deck_id: 'nope' })).rejects.toThrow('Deck not found')
    })
  })
})

// ─── Card Management ───────────────────────────────────────────

describe('Card Management', () => {
  const bolCard = mockScryfallCard('Lightning Bolt', {
    type_line: 'Instant',
    set: 'lea',
    collector_number: '161',
  })

  describe('add_card', () => {
    it('adds a card by name', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('add_card', { deck_id: deck.id, name: 'Lightning Bolt' }) as any
      expect(result.success).toBe(true)
      expect(result.card.name).toBe('Lightning Bolt')
      expect(deck.cards).toHaveLength(1)
    })

    it('adds a card by set + collector number', async () => {
      mockGetCardBySetAndNumber.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('add_card', {
        deck_id: deck.id, name: 'Lightning Bolt', set_code: 'lea', collector_number: '161'
      })
      expect(mockGetCardBySetAndNumber).toHaveBeenCalledWith('lea', '161')
    })

    it('adds to sideboard', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('add_card', { deck_id: deck.id, name: 'Lightning Bolt', to_sideboard: true })
      expect(deck.sideboard).toHaveLength(1)
      expect(deck.cards).toHaveLength(0)
    })

    it('adds to alternates', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('add_card', { deck_id: deck.id, name: 'Lightning Bolt', to_alternates: true })
      expect(deck.alternates).toHaveLength(1)
    })

    it('throws when card not found on Scryfall', async () => {
      mockSearchCardByName.mockResolvedValue(null as any)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await expect(call('add_card', { deck_id: deck.id, name: 'Fake Card' }))
        .rejects.toThrow('Card not found')
    })

    it('throws when deck not found', async () => {
      await expect(call('add_card', { deck_id: 'nope', name: 'X' }))
        .rejects.toThrow('Deck not found')
    })

    it('respects quantity and roles', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('add_card', { deck_id: deck.id, name: 'Lightning Bolt', quantity: 3, roles: ['removal'] })
      expect(deck.cards[0].quantity).toBe(3)
      expect(deck.cards[0].roles).toEqual(['removal'])
    })
  })

  describe('remove_card', () => {
    it('removes a card entirely', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      const result = await call('remove_card', { deck_id: deck.id, name: 'Lightning Bolt' }) as any
      expect(result.success).toBe(true)
      expect(deck.cards).toHaveLength(0)
    })

    it('decreases quantity when partial remove', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt', { quantity: 4 }))
      mock._decks.set(deck.id, deck)

      await call('remove_card', { deck_id: deck.id, name: 'Lightning Bolt', quantity: 2 })
      expect(deck.cards[0].quantity).toBe(2)
    })

    it('throws when card not in deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('remove_card', { deck_id: deck.id, name: 'Nope' }))
        .rejects.toThrow('Card not found in deck')
    })

    it('removes from sideboard', async () => {
      const deck = makeDeck()
      deck.sideboard.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      await call('remove_card', { deck_id: deck.id, name: 'Lightning Bolt', from_sideboard: true })
      expect(deck.sideboard).toHaveLength(0)
    })
  })

  describe('update_card', () => {
    it('replaces roles', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
      mock._decks.set(deck.id, deck)

      await call('update_card', { deck_id: deck.id, name: 'Sol Ring', roles: ['mana-fixer'] })
      expect(deck.cards[0].roles).toEqual(['mana-fixer'])
    })

    it('adds roles', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
      mock._decks.set(deck.id, deck)

      await call('update_card', { deck_id: deck.id, name: 'Sol Ring', add_roles: ['engine'] })
      expect(deck.cards[0].roles).toEqual(['ramp', 'engine'])
    })

    it('removes roles', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp', 'engine'] }))
      mock._decks.set(deck.id, deck)

      await call('update_card', { deck_id: deck.id, name: 'Sol Ring', remove_roles: ['ramp'] })
      expect(deck.cards[0].roles).toEqual(['engine'])
    })

    it('updates status and ownership', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck.id, deck)

      await call('update_card', {
        deck_id: deck.id, name: 'Sol Ring', status: 'considering', ownership: 'need_to_buy'
      })
      expect(deck.cards[0].inclusion).toBe('considering')
      expect(deck.cards[0].ownership).toBe('need_to_buy')
    })

    it('finds card in alternates', async () => {
      const deck = makeDeck()
      deck.alternates.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck.id, deck)

      const result = await call('update_card', { deck_id: deck.id, name: 'Sol Ring', pinned: true }) as any
      expect(result.success).toBe(true)
      expect(deck.alternates[0].isPinned).toBe(true)
    })

    it('throws when card not found', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('update_card', { deck_id: deck.id, name: 'Nope' }))
        .rejects.toThrow('Card not found in deck')
    })
  })

  describe('move_card', () => {
    it('moves card from mainboard to sideboard', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      const result = await call('move_card', {
        deck_id: deck.id, name: 'Lightning Bolt', from: 'mainboard', to: 'sideboard'
      }) as any
      expect(result.success).toBe(true)
      expect(deck.cards).toHaveLength(0)
      expect(deck.sideboard).toHaveLength(1)
    })

    it('throws when card not in source list', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('move_card', {
        deck_id: deck.id, name: 'Nope', from: 'mainboard', to: 'sideboard'
      })).rejects.toThrow('Card not found in mainboard')
    })
  })

  describe('lookup_card', () => {
    it('returns card info', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const result = await call('lookup_card', { name: 'Lightning Bolt' }) as any
      expect(result.name).toBe('Lightning Bolt')
      expect(result.typeLine).toBe('Instant')
    })

    it('uses set+number when provided', async () => {
      mockGetCardBySetAndNumber.mockResolvedValue(bolCard)
      await call('lookup_card', { name: 'Lightning Bolt', set_code: 'lea', collector_number: '161' })
      expect(mockGetCardBySetAndNumber).toHaveBeenCalledWith('lea', '161')
    })

    it('throws when not found', async () => {
      mockSearchCardByName.mockResolvedValue(null as any)
      await expect(call('lookup_card', { name: 'Fake' })).rejects.toThrow('Card not found')
    })
  })
})

// ─── Views ─────────────────────────────────────────────────────

describe('Views', () => {
  describe('view_deck', () => {
    it('renders full view by default', async () => {
      const deck = makeDeck({ name: 'View Test' })
      mock._decks.set(deck.id, deck)
      mock._setGlobalRoles([])

      const result = await call('view_deck', { deck_id: deck.id }) as string
      expect(result).toContain('View Test')
    })

    it('throws when deck not found', async () => {
      await expect(call('view_deck', { deck_id: 'nope' })).rejects.toThrow('Deck not found')
    })

    it('accepts filter parameters', async () => {
      const deck = makeDeck({ name: 'Filter Test' })
      deck.cards.push(makeDeckCard('Elf', { typeLine: 'Creature — Elf', roles: ['ramp'] }))
      deck.cards.push(makeDeckCard('Bolt', { typeLine: 'Instant', roles: ['removal'] }))
      mock._decks.set(deck.id, deck)
      mock._setGlobalRoles([])

      // Should not throw with filters
      const result = await call('view_deck', {
        deck_id: deck.id,
        view: 'curve',
        filters: [{ type: 'card-type', mode: 'include', values: ['Creature'] }],
      }) as string
      expect(result).toContain('Filter Test')
    })
  })

  describe('list_views', () => {
    it('returns 8 view descriptions', async () => {
      const result = await call('list_views') as any[]
      expect(result).toHaveLength(8)
      expect(result.map((v: any) => v.id)).toContain('full')
      expect(result.map((v: any) => v.id)).toContain('notes')
    })
  })
})

// ─── Roles ─────────────────────────────────────────────────────

describe('Roles', () => {
  describe('list_roles', () => {
    it('returns global roles only when no deck_id', async () => {
      mock._setGlobalRoles([{ id: 'ramp', name: 'Ramp' }])
      const result = await call('list_roles') as any
      expect(result.global).toHaveLength(1)
      expect(result.custom).toBeUndefined()
    })

    it('returns global + custom when deck_id provided', async () => {
      mock._setGlobalRoles([{ id: 'ramp', name: 'Ramp' }])
      const deck = makeDeck()
      deck.customRoles.push({ id: 'custom-one', name: 'Custom' })
      mock._decks.set(deck.id, deck)

      const result = await call('list_roles', { deck_id: deck.id }) as any
      expect(result.global).toHaveLength(1)
      expect(result.custom).toHaveLength(1)
    })
  })

  describe('add_custom_role', () => {
    it('adds a custom role to deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('add_custom_role', {
        deck_id: deck.id, id: 'my-role', name: 'My Role'
      }) as any
      expect(result.success).toBe(true)
      expect(deck.customRoles).toHaveLength(1)
    })

    it('throws on duplicate', async () => {
      const deck = makeDeck()
      deck.customRoles.push({ id: 'dup', name: 'Dup' })
      mock._decks.set(deck.id, deck)

      await expect(call('add_custom_role', { deck_id: deck.id, id: 'dup', name: 'Dup' }))
        .rejects.toThrow('Role already exists')
    })
  })

  describe('add_global_role', () => {
    it('adds a global role', async () => {
      mock._setGlobalRoles([])
      const result = await call('add_global_role', { id: 'new-role', name: 'New Role' }) as any
      expect(result.success).toBe(true)
      expect((storage.saveGlobalRoles as any).mock.calls[0][0]).toHaveLength(1)
    })

    it('throws on duplicate', async () => {
      mock._setGlobalRoles([{ id: 'existing', name: 'Existing' }])
      await expect(call('add_global_role', { id: 'existing', name: 'Existing' }))
        .rejects.toThrow('Role already exists')
    })
  })

  describe('update_global_role', () => {
    it('updates role properties', async () => {
      mock._setGlobalRoles([{ id: 'ramp', name: 'Ramp' }])
      const result = await call('update_global_role', { id: 'ramp', name: 'Ramp Updated' }) as any
      expect(result.success).toBe(true)
      expect(result.role.name).toBe('Ramp Updated')
    })

    it('throws when not found', async () => {
      mock._setGlobalRoles([])
      await expect(call('update_global_role', { id: 'nope' })).rejects.toThrow('Role not found')
    })
  })

  describe('delete_global_role', () => {
    it('deletes a role', async () => {
      mock._setGlobalRoles([{ id: 'ramp', name: 'Ramp' }])
      const result = await call('delete_global_role', { id: 'ramp' }) as any
      expect(result.success).toBe(true)
    })

    it('throws when not found', async () => {
      mock._setGlobalRoles([])
      await expect(call('delete_global_role', { id: 'nope' })).rejects.toThrow('Role not found')
    })
  })
})

// ─── Commander ─────────────────────────────────────────────────

describe('Commander', () => {
  describe('set_commanders', () => {
    it('sets commander and color identity', async () => {
      const kenrith = mockScryfallCard('Kenrith, the Returned King', {
        color_identity: ['W', 'U', 'B', 'R', 'G'],
      })
      mockSearchCardByName.mockResolvedValue(kenrith)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('set_commanders', {
        deck_id: deck.id, commander_name: 'Kenrith, the Returned King'
      }) as any
      expect(result.success).toBe(true)
      expect(result.commanders).toContain('Kenrith, the Returned King')
      expect(deck.colorIdentity).toEqual(['W', 'U', 'B', 'R', 'G'])
    })

    it('rejects non-commander format', async () => {
      const deck = makeDeck({ name: 'Standard Deck' })
      // Override format to standard
      deck.format = { type: 'standard', deckSize: 60, sideboardSize: 15, cardLimit: 4, unlimitedCards: [] }
      mock._decks.set(deck.id, deck)

      await expect(call('set_commanders', { deck_id: deck.id, commander_name: 'X' }))
        .rejects.toThrow('Commanders can only be set for Commander format decks')
    })

    it('rejects duplicate commander', async () => {
      const kenrith = mockScryfallCard('Kenrith, the Returned King', {
        color_identity: ['W', 'U', 'B', 'R', 'G'],
      })
      mockSearchCardByName.mockResolvedValue(kenrith)
      const deck = makeDeck()
      deck.commanders.push({
        name: 'Kenrith, the Returned King', setCode: 'eld', collectorNumber: '303',
      })
      mock._decks.set(deck.id, deck)

      await expect(call('set_commanders', {
        deck_id: deck.id, commander_name: 'Kenrith, the Returned King'
      })).rejects.toThrow('already a commander')
    })
  })
})

// ─── Interest List ─────────────────────────────────────────────

describe('Interest List', () => {
  describe('get_interest_list', () => {
    it('returns the interest list', async () => {
      const result = await call('get_interest_list') as any
      expect(result.items).toEqual([])
    })
  })

  describe('add_to_interest_list', () => {
    it('adds a card', async () => {
      mockSearchCardByName.mockResolvedValue(mockScryfallCard('Rhystic Study'))
      const result = await call('add_to_interest_list', { name: 'Rhystic Study' }) as any
      expect(result.success).toBe(true)
      expect(result.item.card.name).toBe('Rhystic Study')
    })

    it('throws when card not found', async () => {
      mockSearchCardByName.mockResolvedValue(null as any)
      await expect(call('add_to_interest_list', { name: 'Fake' })).rejects.toThrow('Card not found')
    })
  })

  describe('remove_from_interest_list', () => {
    it('removes a card', async () => {
      mock._setInterestList({
        version: 1, updatedAt: '', items: [{
          id: '1', card: { name: 'Rhystic Study', setCode: 'pcy', collectorNumber: '45' },
          addedAt: '',
        }]
      })
      const result = await call('remove_from_interest_list', { card_name: 'Rhystic Study' }) as any
      expect(result.success).toBe(true)
    })

    it('throws when not found', async () => {
      await expect(call('remove_from_interest_list', { card_name: 'Nope' }))
        .rejects.toThrow('Card not found in interest list')
    })
  })
})

// ─── Import/Export ─────────────────────────────────────────────

describe('Import/Export', () => {
  describe('import_deck', () => {
    it('imports cards into a new deck', async () => {
      mockSearchCardByName.mockResolvedValue(mockScryfallCard('Lightning Bolt', {
        type_line: 'Instant', set: 'lea', collector_number: '161'
      }))

      const result = await call('import_deck', {
        text: '4 Lightning Bolt', name: 'Imported', format: 'standard'
      }) as any
      expect(result.success).toBe(true)
      expect(result.cardsAdded).toBe(1)
    })

    it('imports into existing deck', async () => {
      mockSearchCardByName.mockResolvedValue(mockScryfallCard('Sol Ring', {
        type_line: 'Artifact', set: 'cmd', collector_number: '190'
      }))
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('import_deck', {
        deck_id: deck.id, text: '1 Sol Ring'
      }) as any
      expect(result.deckId).toBe(deck.id)
    })

    it('throws on unknown format', async () => {
      await expect(call('import_deck', { text: 'x', source_format: 'bogus' }))
        .rejects.toThrow('Unknown format')
    })
  })

  describe('export_deck', () => {
    it('exports a deck', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt', {
        card: { name: 'Lightning Bolt', setCode: 'lea', collectorNumber: '161' }
      }))
      mock._decks.set(deck.id, deck)

      const result = await call('export_deck', { deck_id: deck.id, format: 'simple' }) as any
      expect(result.format).toBe('simple')
      expect(result.text).toContain('Lightning Bolt')
    })

    it('throws on unknown format', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('export_deck', { deck_id: deck.id, format: 'bogus' }))
        .rejects.toThrow('Unknown format')
    })
  })

  describe('list_export_formats', () => {
    it('returns all formats', async () => {
      const result = await call('list_export_formats') as any[]
      expect(result.length).toBeGreaterThanOrEqual(5)
      expect(result.map((f: any) => f.id)).toContain('arena')
    })
  })
})

// ─── Notes ─────────────────────────────────────────────────────

describe('Notes', () => {
  describe('add_deck_note', () => {
    it('adds a note', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('add_deck_note', {
        deck_id: deck.id, title: 'Combo', content: 'A + B', note_type: 'combo'
      }) as any
      expect(result.success).toBe(true)
      expect(result.note.title).toBe('Combo')
      expect(deck.notes).toHaveLength(1)
    })

    it('propagates role to referenced cards', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck.id, deck)

      await call('add_deck_note', {
        deck_id: deck.id, title: 'Ramp Package', content: 'Mana', note_type: 'strategy',
        card_names: ['Sol Ring'], role_id: 'ramp',
      })
      expect(deck.cards[0].roles).toContain('ramp')
    })
  })

  describe('update_deck_note', () => {
    it('updates note fields', async () => {
      const deck = makeDeck()
      deck.notes.push({
        id: 'note-1', title: 'Old', content: 'Old content', noteType: 'general',
        cardRefs: [], createdAt: '', updatedAt: '',
      })
      mock._decks.set(deck.id, deck)

      const result = await call('update_deck_note', {
        deck_id: deck.id, note_id: 'note-1', title: 'New', content: 'New content',
      }) as any
      expect(result.note.title).toBe('New')
    })

    it('removes role from cards when remove_role is true', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
      deck.notes.push({
        id: 'note-1', title: 'T', content: 'C', noteType: 'strategy',
        cardRefs: [{ cardName: 'Sol Ring', ordinal: 1 }], roleId: 'ramp',
        createdAt: '', updatedAt: '',
      })
      mock._decks.set(deck.id, deck)

      await call('update_deck_note', { deck_id: deck.id, note_id: 'note-1', remove_role: true, role_id: '' })
      expect(deck.cards[0].roles).not.toContain('ramp')
    })

    it('throws when note not found', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('update_deck_note', { deck_id: deck.id, note_id: 'nope' }))
        .rejects.toThrow('Note not found')
    })
  })

  describe('delete_deck_note', () => {
    it('deletes a note', async () => {
      const deck = makeDeck()
      deck.notes.push({
        id: 'note-1', title: 'T', content: 'C', noteType: 'general',
        cardRefs: [], createdAt: '', updatedAt: '',
      })
      mock._decks.set(deck.id, deck)

      const result = await call('delete_deck_note', { deck_id: deck.id, note_id: 'note-1' }) as any
      expect(result.success).toBe(true)
      expect(deck.notes).toHaveLength(0)
    })

    it('throws when note not found', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('delete_deck_note', { deck_id: deck.id, note_id: 'nope' }))
        .rejects.toThrow('Note not found')
    })
  })

  describe('list_deck_notes', () => {
    it('lists notes', async () => {
      const deck = makeDeck()
      deck.notes.push({
        id: 'note-1', title: 'T', content: 'C', noteType: 'combo',
        cardRefs: [{ cardName: 'Sol Ring', ordinal: 1 }], createdAt: '', updatedAt: '',
      })
      mock._decks.set(deck.id, deck)

      const result = await call('list_deck_notes', { deck_id: deck.id }) as any[]
      expect(result).toHaveLength(1)
      expect(result[0].noteType).toBe('combo')
    })

    it('throws when deck not found', async () => {
      await expect(call('list_deck_notes', { deck_id: 'nope' })).rejects.toThrow('Deck not found')
    })
  })
})

// ─── Validation ────────────────────────────────────────────────

describe('Validation', () => {
  describe('validate_deck', () => {
    it('reports under-sized deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('validate_deck', { deck_id: deck.id }) as any
      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(expect.stringContaining('needs 100'))
    })

    it('reports missing commander', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('validate_deck', { deck_id: deck.id }) as any
      expect(result.issues).toContainEqual(expect.stringContaining('No commander'))
    })

    it('reports card limit violations', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt', { quantity: 2 }))
      // Commander has 1-card limit
      mock._decks.set(deck.id, deck)

      const result = await call('validate_deck', { deck_id: deck.id }) as any
      expect(result.issues).toContainEqual(expect.stringContaining('Lightning Bolt'))
    })

    it('valid deck with enough cards and commander', async () => {
      const deck = makeDeck()
      deck.commanders.push({ name: 'Kenrith', setCode: 'eld', collectorNumber: '303' })
      // Add 99 unique confirmed cards (each quantity 1)
      for (let i = 0; i < 99; i++) {
        deck.cards.push(makeDeckCard(`Card ${i}`, {
          card: { name: `Card ${i}`, setCode: 'test', collectorNumber: `${i}` },
          typeLine: 'Land',
        }))
      }
      mock._decks.set(deck.id, deck)

      const result = await call('validate_deck', { deck_id: deck.id }) as any
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })
})

// ─── Search/Reports ────────────────────────────────────────────

describe('Search/Reports', () => {
  describe('search_decks_for_card', () => {
    it('finds card across decks', async () => {
      const deck1 = makeDeck({ name: 'Deck 1' })
      deck1.cards.push(makeDeckCard('Sol Ring'))
      const deck2 = makeDeck({ name: 'Deck 2' })
      deck2.cards.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck1.id, deck1)
      mock._decks.set(deck2.id, deck2)

      const result = await call('search_decks_for_card', { card_name: 'Sol Ring' }) as any[]
      expect(result).toHaveLength(2)
    })

    it('searches in alternates and sideboard', async () => {
      const deck = makeDeck()
      deck.sideboard.push(makeDeckCard('Lightning Bolt'))
      deck.alternates.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      const result = await call('search_decks_for_card', { card_name: 'Lightning Bolt' }) as any[]
      expect(result).toHaveLength(2)
      expect(result.map((r: any) => r.location)).toContain('sideboard')
      expect(result.map((r: any) => r.location)).toContain('alternates')
    })

    it('returns empty for no matches', async () => {
      const result = await call('search_decks_for_card', { card_name: 'Nope' }) as any[]
      expect(result).toHaveLength(0)
    })
  })

  describe('get_buy_list', () => {
    it('aggregates need_to_buy cards across decks', async () => {
      const deck1 = makeDeck({ name: 'Deck 1' })
      deck1.cards.push(makeDeckCard('Sol Ring', { ownership: 'need_to_buy', quantity: 1 }))
      const deck2 = makeDeck({ name: 'Deck 2' })
      deck2.cards.push(makeDeckCard('Sol Ring', { ownership: 'need_to_buy', quantity: 1 }))
      mock._decks.set(deck1.id, deck1)
      mock._decks.set(deck2.id, deck2)

      const result = await call('get_buy_list') as any[]
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(2)
      expect(result[0].decks).toContain('Deck 1')
      expect(result[0].decks).toContain('Deck 2')
    })

    it('excludes owned cards', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { ownership: 'owned' }))
      mock._decks.set(deck.id, deck)

      const result = await call('get_buy_list') as any[]
      expect(result).toHaveLength(0)
    })
  })
})

// ─── Unknown tool ──────────────────────────────────────────────

describe('Unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(call('nonexistent_tool')).rejects.toThrow('Unknown tool')
  })
})
