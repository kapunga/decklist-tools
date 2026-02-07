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
    searchCardByNameExact: vi.fn(),
    getCardBySetAndNumber: vi.fn(),
    getCardById: vi.fn(),
    searchCards: vi.fn(),
  }
})

import { searchCardByName, searchCardByNameExact, getCardBySetAndNumber, getCardById, searchCards } from '@mtg-deckbuilder/shared'
const mockSearchCardByName = vi.mocked(searchCardByName)
const mockSearchCardByNameExact = vi.mocked(searchCardByNameExact)
const mockGetCardBySetAndNumber = vi.mocked(getCardBySetAndNumber)
const mockGetCardById = vi.mocked(getCardById)
const mockSearchCards = vi.mocked(searchCards)

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
  it('returns 15 tools', () => {
    expect(getToolDefinitions()).toHaveLength(15)
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

  describe('manage_deck create', () => {
    it('creates a deck with valid format', async () => {
      const result = await call('manage_deck', { action: 'create', name: 'New Deck', format: 'commander' }) as any
      expect(result.name).toBe('New Deck')
      expect(result.format).toBe('commander')
      expect((storage.saveDeck as any).mock.calls).toHaveLength(1)
    })

    it('throws on invalid format', async () => {
      await expect(call('manage_deck', { action: 'create', name: 'Bad', format: 'vintage' }))
        .rejects.toThrow('Invalid format')
    })

    it('sets optional fields', async () => {
      await call('manage_deck', {
        action: 'create', name: 'Deck', format: 'standard', archetype: 'Aggro', description: 'Fast'
      })
      const saved = (storage.saveDeck as any).mock.calls[0][0]
      expect(saved.archetype).toBe('Aggro')
      expect(saved.description).toBe('Fast')
    })

    it('throws when name missing', async () => {
      await expect(call('manage_deck', { action: 'create', format: 'commander' }))
        .rejects.toThrow('name is required')
    })

    it('throws when format missing', async () => {
      await expect(call('manage_deck', { action: 'create', name: 'X' }))
        .rejects.toThrow('format is required')
    })
  })

  describe('get_deck', () => {
    it('gets deck by id with validation', async () => {
      const deck = makeDeck({ name: 'Found' })
      mock._decks.set(deck.id, deck)
      const result = await call('get_deck', { identifier: deck.id }) as any
      expect(result.name).toBe('Found')
      expect(result.validation).toBeDefined()
      expect(result.validation.valid).toBe(false) // empty deck
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

  describe('manage_deck update', () => {
    it('updates name', async () => {
      const deck = makeDeck({ name: 'Old' })
      mock._decks.set(deck.id, deck)
      await call('manage_deck', { action: 'update', deck_id: deck.id, name: 'New' })
      expect(deck.name).toBe('New')
    })

    it('throws when deck not found', async () => {
      await expect(call('manage_deck', { action: 'update', deck_id: 'nope' })).rejects.toThrow('Deck not found')
    })
  })

  describe('manage_deck delete', () => {
    it('deletes existing deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      const result = await call('manage_deck', { action: 'delete', deck_id: deck.id }) as any
      expect(result.success).toBe(true)
    })

    it('throws when not found', async () => {
      await expect(call('manage_deck', { action: 'delete', deck_id: 'nope' })).rejects.toThrow('Deck not found')
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

  describe('manage_card add', () => {
    it('adds a card by name', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('manage_card', { action: 'add', deck_id: deck.id, name: 'Lightning Bolt' }) as any
      expect(result.success).toBe(true)
      expect(result.cards[0].name).toBe('Lightning Bolt')
      expect(deck.cards).toHaveLength(1)
    })

    it('adds a card by set + collector number', async () => {
      mockGetCardBySetAndNumber.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('manage_card', {
        action: 'add', deck_id: deck.id, name: 'Lightning Bolt', set_code: 'lea', collector_number: '161'
      })
      expect(mockGetCardBySetAndNumber).toHaveBeenCalledWith('lea', '161')
    })

    it('adds to sideboard', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'add', deck_id: deck.id, name: 'Lightning Bolt', to_sideboard: true })
      expect(deck.sideboard).toHaveLength(1)
      expect(deck.cards).toHaveLength(0)
    })

    it('adds to alternates', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'add', deck_id: deck.id, name: 'Lightning Bolt', to_alternates: true })
      expect(deck.alternates).toHaveLength(1)
    })

    it('throws when card not found on Scryfall', async () => {
      mockSearchCardByName.mockResolvedValue(null as any)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await expect(call('manage_card', { action: 'add', deck_id: deck.id, name: 'Fake Card' }))
        .rejects.toThrow('Card not found')
    })

    it('throws when deck not found', async () => {
      await expect(call('manage_card', { action: 'add', deck_id: 'nope', name: 'X' }))
        .rejects.toThrow('Deck not found')
    })

    it('respects quantity and roles', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'add', deck_id: deck.id, name: 'Lightning Bolt', quantity: 3, roles: ['removal'] })
      expect(deck.cards[0].quantity).toBe(3)
      expect(deck.cards[0].roles).toEqual(['removal'])
    })
  })

  describe('manage_card remove', () => {
    it('removes a card entirely', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      const result = await call('manage_card', { action: 'remove', deck_id: deck.id, name: 'Lightning Bolt' }) as any
      expect(result.success).toBe(true)
      expect(deck.cards).toHaveLength(0)
    })

    it('decreases quantity when partial remove', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt', { quantity: 4 }))
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'remove', deck_id: deck.id, name: 'Lightning Bolt', quantity: 2 })
      expect(deck.cards[0].quantity).toBe(2)
    })

    it('throws when card not in deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('manage_card', { action: 'remove', deck_id: deck.id, name: 'Nope' }))
        .rejects.toThrow('Card not found in deck')
    })

    it('removes from sideboard', async () => {
      const deck = makeDeck()
      deck.sideboard.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'remove', deck_id: deck.id, name: 'Lightning Bolt', from_sideboard: true })
      expect(deck.sideboard).toHaveLength(0)
    })
  })

  describe('manage_card update', () => {
    it('replaces roles', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'update', deck_id: deck.id, name: 'Sol Ring', roles: ['mana-fixer'] })
      expect(deck.cards[0].roles).toEqual(['mana-fixer'])
    })

    it('adds roles', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'update', deck_id: deck.id, name: 'Sol Ring', add_roles: ['engine'] })
      expect(deck.cards[0].roles).toEqual(['ramp', 'engine'])
    })

    it('removes roles', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp', 'engine'] }))
      mock._decks.set(deck.id, deck)

      await call('manage_card', { action: 'update', deck_id: deck.id, name: 'Sol Ring', remove_roles: ['ramp'] })
      expect(deck.cards[0].roles).toEqual(['engine'])
    })

    it('updates status and ownership', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck.id, deck)

      await call('manage_card', {
        action: 'update', deck_id: deck.id, name: 'Sol Ring', status: 'considering', ownership: 'need_to_buy'
      })
      expect(deck.cards[0].inclusion).toBe('considering')
      expect(deck.cards[0].ownership).toBe('need_to_buy')
    })

    it('finds card in alternates', async () => {
      const deck = makeDeck()
      deck.alternates.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck.id, deck)

      const result = await call('manage_card', { action: 'update', deck_id: deck.id, name: 'Sol Ring', pinned: true }) as any
      expect(result.success).toBe(true)
      expect(deck.alternates[0].isPinned).toBe(true)
    })

    it('throws when card not found', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('manage_card', { action: 'update', deck_id: deck.id, name: 'Nope' }))
        .rejects.toThrow('Card not found in deck')
    })
  })

  describe('manage_card move', () => {
    it('moves card from mainboard to sideboard', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Lightning Bolt'))
      mock._decks.set(deck.id, deck)

      const result = await call('manage_card', {
        action: 'move', deck_id: deck.id, name: 'Lightning Bolt', from: 'mainboard', to: 'sideboard'
      }) as any
      expect(result.success).toBe(true)
      expect(deck.cards).toHaveLength(0)
      expect(deck.sideboard).toHaveLength(1)
    })

    it('throws when card not in source list', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('manage_card', {
        action: 'move', deck_id: deck.id, name: 'Nope', from: 'mainboard', to: 'sideboard'
      })).rejects.toThrow('Card not found in mainboard')
    })
  })
})

// ─── Card Search ────────────────────────────────────────────────

describe('Card Search', () => {
  const bolCard = mockScryfallCard('Lightning Bolt', {
    type_line: 'Instant',
    set: 'lea',
    collector_number: '161',
  })

  describe('search_cards', () => {
    it('fuzzy name lookup by default', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const result = await call('search_cards', { query: 'Lightning Bolt' }) as any
      // Default format is compact (string)
      expect(result).toContain('Lightning Bolt')
      expect(result).toContain('Instant')
    })

    it('exact name lookup', async () => {
      mockSearchCardByNameExact.mockResolvedValue(bolCard)
      const result = await call('search_cards', { query: 'Lightning Bolt', exact: true }) as any
      expect(result).toContain('Lightning Bolt')
      expect(mockSearchCardByNameExact).toHaveBeenCalledWith('Lightning Bolt')
    })

    it('fuzzy name lookup returns JSON when format is json', async () => {
      mockSearchCardByName.mockResolvedValue(bolCard)
      const result = await call('search_cards', { query: 'Lightning Bolt', format: 'json' }) as any
      expect(result.name).toBe('Lightning Bolt')
      expect(result.typeLine).toBe('Instant')
    })

    it('uses set+number when provided', async () => {
      mockGetCardBySetAndNumber.mockResolvedValue(bolCard)
      await call('search_cards', { query: 'Lightning Bolt', set_code: 'lea', collector_number: '161' })
      expect(mockGetCardBySetAndNumber).toHaveBeenCalledWith('lea', '161')
    })

    it('detects UUID and fetches by ID', async () => {
      mockGetCardById.mockResolvedValue(bolCard)
      await call('search_cards', { query: '12345678-1234-1234-1234-123456789abc' })
      expect(mockGetCardById).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc')
    })

    it('detects Scryfall operators and runs search (compact)', async () => {
      mockSearchCards.mockResolvedValue({
        total_cards: 1,
        has_more: false,
        data: [bolCard],
      } as any)
      const result = await call('search_cards', { query: 't:instant c:red cmc<=1' }) as any
      expect(result).toContain('Found 1 cards')
      expect(result).toContain('Lightning Bolt')
    })

    it('detects Scryfall operators and runs search (json)', async () => {
      mockSearchCards.mockResolvedValue({
        total_cards: 1,
        has_more: false,
        data: [bolCard],
      } as any)
      const result = await call('search_cards', { query: 't:instant c:red cmc<=1', format: 'json' }) as any
      expect(result.totalCards).toBe(1)
      expect(result.cards).toHaveLength(1)
    })

    it('throws when not found', async () => {
      mockSearchCardByName.mockResolvedValue(null as any)
      await expect(call('search_cards', { query: 'Fake' })).rejects.toThrow('Card not found')
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

      const result = await call('view_deck', {
        deck_id: deck.id,
        view: 'curve',
        filters: [{ type: 'card-type', mode: 'include', values: ['Creature'] }],
      }) as string
      expect(result).toContain('Filter Test')
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

  describe('manage_role add_custom', () => {
    it('adds a custom role to deck', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('manage_role', {
        action: 'add_custom', deck_id: deck.id, id: 'my-role', name: 'My Role'
      }) as any
      expect(result.success).toBe(true)
      expect(deck.customRoles).toHaveLength(1)
    })

    it('throws on duplicate', async () => {
      const deck = makeDeck()
      deck.customRoles.push({ id: 'dup', name: 'Dup' })
      mock._decks.set(deck.id, deck)

      await expect(call('manage_role', { action: 'add_custom', deck_id: deck.id, id: 'dup', name: 'Dup' }))
        .rejects.toThrow('Role already exists')
    })
  })

  describe('manage_role add_global', () => {
    it('adds a global role', async () => {
      mock._setGlobalRoles([])
      const result = await call('manage_role', { action: 'add_global', id: 'new-role', name: 'New Role' }) as any
      expect(result.success).toBe(true)
      expect((storage.saveGlobalRoles as any).mock.calls[0][0]).toHaveLength(1)
    })

    it('throws on duplicate', async () => {
      mock._setGlobalRoles([{ id: 'existing', name: 'Existing' }])
      await expect(call('manage_role', { action: 'add_global', id: 'existing', name: 'Existing' }))
        .rejects.toThrow('Role already exists')
    })
  })

  describe('manage_role update_global', () => {
    it('updates role properties', async () => {
      mock._setGlobalRoles([{ id: 'ramp', name: 'Ramp' }])
      const result = await call('manage_role', { action: 'update_global', id: 'ramp', name: 'Ramp Updated' }) as any
      expect(result.success).toBe(true)
      expect(result.role.name).toBe('Ramp Updated')
    })

    it('throws when not found', async () => {
      mock._setGlobalRoles([])
      await expect(call('manage_role', { action: 'update_global', id: 'nope' })).rejects.toThrow('Role not found')
    })
  })

  describe('manage_role delete_global', () => {
    it('deletes a role', async () => {
      mock._setGlobalRoles([{ id: 'ramp', name: 'Ramp' }])
      const result = await call('manage_role', { action: 'delete_global', id: 'ramp' }) as any
      expect(result.success).toBe(true)
    })

    it('throws when not found', async () => {
      mock._setGlobalRoles([])
      await expect(call('manage_role', { action: 'delete_global', id: 'nope' })).rejects.toThrow('Role not found')
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

  describe('manage_interest_list add', () => {
    it('adds a card', async () => {
      mockSearchCardByName.mockResolvedValue(mockScryfallCard('Rhystic Study'))
      const result = await call('manage_interest_list', { action: 'add', name: 'Rhystic Study' }) as any
      expect(result.success).toBe(true)
      expect(result.item.card.name).toBe('Rhystic Study')
    })

    it('throws when card not found', async () => {
      mockSearchCardByName.mockResolvedValue(null as any)
      await expect(call('manage_interest_list', { action: 'add', name: 'Fake' })).rejects.toThrow('Card not found')
    })
  })

  describe('manage_interest_list remove', () => {
    it('removes a card', async () => {
      mock._setInterestList({
        version: 1, updatedAt: '', items: [{
          id: '1', card: { name: 'Rhystic Study', setCode: 'pcy', collectorNumber: '45' },
          addedAt: '',
        }]
      })
      const result = await call('manage_interest_list', { action: 'remove', card_name: 'Rhystic Study' }) as any
      expect(result.success).toBe(true)
    })

    it('throws when not found', async () => {
      await expect(call('manage_interest_list', { action: 'remove', card_name: 'Nope' }))
        .rejects.toThrow('Card not found in interest list')
    })
  })
})

// ─── Notes ─────────────────────────────────────────────────────

describe('Notes', () => {
  describe('manage_deck_note add', () => {
    it('adds a note', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)

      const result = await call('manage_deck_note', {
        action: 'add', deck_id: deck.id, title: 'Combo', content: 'A + B', note_type: 'combo'
      }) as any
      expect(result.success).toBe(true)
      expect(result.note.title).toBe('Combo')
      expect(deck.notes).toHaveLength(1)
    })

    it('propagates role to referenced cards', async () => {
      const deck = makeDeck()
      deck.cards.push(makeDeckCard('Sol Ring'))
      mock._decks.set(deck.id, deck)

      await call('manage_deck_note', {
        action: 'add', deck_id: deck.id, title: 'Ramp Package', content: 'Mana', note_type: 'strategy',
        card_names: ['Sol Ring'], role_id: 'ramp',
      })
      expect(deck.cards[0].roles).toContain('ramp')
    })
  })

  describe('manage_deck_note update', () => {
    it('updates note fields', async () => {
      const deck = makeDeck()
      deck.notes.push({
        id: 'note-1', title: 'Old', content: 'Old content', noteType: 'general',
        cardRefs: [], createdAt: '', updatedAt: '',
      })
      mock._decks.set(deck.id, deck)

      const result = await call('manage_deck_note', {
        action: 'update', deck_id: deck.id, note_id: 'note-1', title: 'New', content: 'New content',
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

      await call('manage_deck_note', { action: 'update', deck_id: deck.id, note_id: 'note-1', remove_role: true, role_id: '' })
      expect(deck.cards[0].roles).not.toContain('ramp')
    })

    it('throws when note not found', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('manage_deck_note', { action: 'update', deck_id: deck.id, note_id: 'nope' }))
        .rejects.toThrow('Note not found')
    })
  })

  describe('manage_deck_note delete', () => {
    it('deletes a note', async () => {
      const deck = makeDeck()
      deck.notes.push({
        id: 'note-1', title: 'T', content: 'C', noteType: 'general',
        cardRefs: [], createdAt: '', updatedAt: '',
      })
      mock._decks.set(deck.id, deck)

      const result = await call('manage_deck_note', { action: 'delete', deck_id: deck.id, note_id: 'note-1' }) as any
      expect(result.success).toBe(true)
      expect(deck.notes).toHaveLength(0)
    })

    it('throws when note not found', async () => {
      const deck = makeDeck()
      mock._decks.set(deck.id, deck)
      await expect(call('manage_deck_note', { action: 'delete', deck_id: deck.id, note_id: 'nope' }))
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

// ─── Validation (via get_deck) ─────────────────────────────────

describe('Validation', () => {
  it('reports under-sized deck via get_deck', async () => {
    const deck = makeDeck()
    mock._decks.set(deck.id, deck)

    const result = await call('get_deck', { identifier: deck.id }) as any
    expect(result.validation.valid).toBe(false)
    expect(result.validation.issues).toContainEqual(expect.stringContaining('needs 100'))
  })

  it('reports missing commander via get_deck', async () => {
    const deck = makeDeck()
    mock._decks.set(deck.id, deck)

    const result = await call('get_deck', { identifier: deck.id }) as any
    expect(result.validation.issues).toContainEqual(expect.stringContaining('No commander'))
  })

  it('reports card limit violations', async () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Lightning Bolt', { quantity: 2 }))
    mock._decks.set(deck.id, deck)

    const result = await call('get_deck', { identifier: deck.id }) as any
    expect(result.validation.issues).toContainEqual(expect.stringContaining('Lightning Bolt'))
  })

  it('valid deck with enough cards and commander', async () => {
    const deck = makeDeck()
    deck.commanders.push({ name: 'Kenrith', setCode: 'eld', collectorNumber: '303' })
    for (let i = 0; i < 99; i++) {
      deck.cards.push(makeDeckCard(`Card ${i}`, {
        card: { name: `Card ${i}`, setCode: 'test', collectorNumber: `${i}` },
        typeLine: 'Land',
      }))
    }
    mock._decks.set(deck.id, deck)

    const result = await call('get_deck', { identifier: deck.id }) as any
    expect(result.validation.valid).toBe(true)
    expect(result.validation.issues).toHaveLength(0)
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

})

// ─── Unknown tool ──────────────────────────────────────────────

describe('Unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(call('nonexistent_tool')).rejects.toThrow('Unknown tool')
  })
})
