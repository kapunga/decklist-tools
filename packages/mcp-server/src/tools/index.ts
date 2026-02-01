import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import {
  Storage,
  type Deck,
  type DeckCard,
  type DeckNote,
  type NoteType,
  type NoteCardRef,
  type RoleDefinition,
  type CardIdentifier,
  type FormatType,
  type InclusionStatus,
  type OwnershipStatus,
  createEmptyDeck,
  generateDeckCardId,
  formatDefaults,
  getCardLimit,
  getCardCount,
  propagateNoteRole,
  searchCardByName,
  searchCardByNameExact,
  getCardBySetAndNumber,
  getCardById,
  searchCards,
  type ScryfallCard,
} from '@mtg-deckbuilder/shared'

import { renderDeckView, getViewDescriptions } from '../views/index.js'

// Scryfall operator patterns for detecting search queries
const SCRYFALL_OPERATORS = /(?:^|\s)(?:t:|c:|ci:|o:|pow:|tou:|cmc[<>=!]|mv[<>=!]|is:|has:|not:|set:|e:|r:|f:|id:|mana:|devotion:|produces:|keyword:|oracle:|name:|flavor:|art:|border:|frame:|game:|year:|date:|usd[<>=!]|eur[<>=!]|tix[<>=!])/i

// Tool definitions
export function getToolDefinitions(): Tool[] {
  const viewDescs = getViewDescriptions()
  const viewList = viewDescs.map(v => `\`${v.id}\`: ${v.description}`).join('; ')

  return [
    // Deck Management
    {
      name: 'list_decks',
      description: 'List all saved decks with summary info',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_deck',
      description: 'Get a deck by ID or name. Includes format validation results.',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Deck UUID or name (case-insensitive)',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'manage_deck',
      description: 'Create, update, or delete a deck.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'update', 'delete'],
          },
          deck_id: { type: 'string', description: 'Required for update/delete' },
          name: { type: 'string', description: 'Deck name (required for create)' },
          format: {
            type: 'string',
            enum: ['commander', 'standard', 'modern', 'kitchen_table'],
            description: 'Required for create',
          },
          archetype: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['action'],
      },
    },

    // Card Management
    {
      name: 'manage_card',
      description: 'Add, remove, update, or move a card in a deck.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'update', 'move'],
          },
          deck_id: { type: 'string' },
          name: { type: 'string', description: 'Card name' },
          // add params
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
          quantity: { type: 'number', default: 1 },
          roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Role IDs (replaces all for update, initial for add)',
          },
          status: {
            type: 'string',
            enum: ['confirmed', 'considering'],
          },
          ownership: {
            type: 'string',
            enum: ['owned', 'pulled', 'need_to_buy'],
          },
          to_alternates: { type: 'boolean' },
          to_sideboard: { type: 'boolean' },
          // remove params
          from_alternates: { type: 'boolean' },
          from_sideboard: { type: 'boolean' },
          // update params
          add_roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Add these roles to existing roles',
          },
          remove_roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Remove these roles from existing roles',
          },
          pinned: { type: 'boolean' },
          notes: { type: 'string' },
          // move params
          from: {
            type: 'string',
            enum: ['mainboard', 'alternates', 'sideboard'],
          },
          to: {
            type: 'string',
            enum: ['mainboard', 'alternates', 'sideboard'],
          },
        },
        required: ['action', 'deck_id', 'name'],
      },
    },

    // Card Search
    {
      name: 'search_cards',
      description: 'Search for cards on Scryfall. Accepts a card name (fuzzy or exact), a Scryfall UUID, or a full Scryfall search query (e.g. "c:blue t:instant cmc<=2"). The query type is auto-detected.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Card name, Scryfall UUID, or Scryfall search query' },
          exact: { type: 'boolean', description: 'Use exact name matching instead of fuzzy' },
          limit: { type: 'number', description: 'Max results for search queries (default 10)' },
          set_code: { type: 'string', description: 'Set code for specific printing' },
          collector_number: { type: 'string', description: 'Collector number for specific printing' },
        },
        required: ['query'],
      },
    },

    // Views
    {
      name: 'view_deck',
      description: `Render a deck using a specific view format. Available views: ${viewList}`,
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          view: { type: 'string', default: 'full' },
          sort_by: { type: 'string' },
          group_by: { type: 'string' },
          filters: {
            type: 'array',
            description: 'Optional card filters to apply',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['cmc', 'color', 'card-type', 'role'] },
                mode: { type: 'string', enum: ['include', 'exclude'] },
                values: { type: 'array', items: {} },
              },
              required: ['type', 'mode', 'values'],
            },
          },
        },
        required: ['deck_id'],
      },
    },

    // Roles
    {
      name: 'list_roles',
      description: 'List all available roles (global + deck-specific if deck_id provided)',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
        },
      },
    },
    {
      name: 'manage_role',
      description: 'Add or manage roles. Actions: add_custom (deck-specific), add_global, update_global, delete_global.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add_custom', 'add_global', 'update_global', 'delete_global'],
          },
          deck_id: { type: 'string', description: 'Required for add_custom' },
          id: { type: 'string', description: 'Role ID (required for all actions)' },
          name: { type: 'string', description: 'Display name (required for add_custom, add_global)' },
          description: { type: 'string' },
          color: { type: 'string', description: 'Hex color code' },
        },
        required: ['action', 'id'],
      },
    },

    // Commanders
    {
      name: 'set_commanders',
      description: 'Set the commanders for a Commander format deck',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          commander_name: {
            type: 'string',
            description: 'Name of the commander card',
          },
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
        },
        required: ['deck_id', 'commander_name'],
      },
    },

    // Interest List
    {
      name: 'get_interest_list',
      description: 'Get the full interest list',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'manage_interest_list',
      description: 'Add or remove cards from the interest list.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove'],
          },
          name: { type: 'string', description: 'Card name (required for add)' },
          card_name: { type: 'string', description: 'Card name to remove (required for remove)' },
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
          notes: { type: 'string' },
          potential_decks: {
            type: 'array',
            items: { type: 'string' },
          },
          source: { type: 'string' },
        },
        required: ['action'],
      },
    },

    // Notes
    {
      name: 'list_deck_notes',
      description: 'List all notes for a deck',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'manage_deck_note',
      description: 'Add, update, or delete a deck note.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'update', 'delete'],
          },
          deck_id: { type: 'string' },
          note_id: { type: 'string', description: 'Required for update/delete' },
          title: { type: 'string' },
          content: { type: 'string', description: 'Markdown description' },
          note_type: {
            type: 'string',
            enum: ['combo', 'synergy', 'theme', 'strategy', 'general'],
          },
          card_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Card names ordered by relevance',
          },
          role_id: { type: 'string', description: 'Optional role to propagate to associated cards' },
          remove_role: { type: 'boolean', description: 'Remove role from associated cards (update/delete)' },
        },
        required: ['action', 'deck_id'],
      },
    },

    // Search/Reports
    {
      name: 'search_decks_for_card',
      description: 'Find which decks contain a specific card',
      inputSchema: {
        type: 'object',
        properties: {
          card_name: { type: 'string' },
        },
        required: ['card_name'],
      },
    },
    {
      name: 'get_buy_list',
      description: 'Get all cards marked need_to_buy across all decks',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ]
}

// Tool call handler
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  storage: Storage
): Promise<unknown> {
  switch (name) {
    case 'list_decks':
      return listDecks(storage)
    case 'get_deck':
      return getDeck(storage, args.identifier as string)
    case 'manage_deck':
      return manageDeck(storage, args as unknown as ManageDeckArgs)
    case 'manage_card':
      return manageCard(storage, args as unknown as ManageCardArgs)
    case 'search_cards':
      return searchCardsHandler(args as unknown as SearchCardsArgs)
    case 'view_deck':
      return viewDeck(storage, args as unknown as ViewDeckArgs)
    case 'list_roles':
      return listRoles(storage, args.deck_id as string | undefined)
    case 'manage_role':
      return manageRole(storage, args as unknown as ManageRoleArgs)
    case 'set_commanders':
      return setCommanders(storage, args as unknown as SetCommandersArgs)
    case 'get_interest_list':
      return getInterestList(storage)
    case 'manage_interest_list':
      return manageInterestList(storage, args as unknown as ManageInterestListArgs)
    case 'list_deck_notes':
      return listDeckNotes(storage, args.deck_id as string)
    case 'manage_deck_note':
      return manageDeckNote(storage, args as unknown as ManageDeckNoteArgs)
    case 'search_decks_for_card':
      return searchDecksForCard(storage, args.card_name as string)
    case 'get_buy_list':
      return getBuyList(storage)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// Type definitions for tool arguments
interface ManageDeckArgs {
  action: 'create' | 'update' | 'delete'
  deck_id?: string
  name?: string
  format?: string
  archetype?: string
  description?: string
}

interface ManageCardArgs {
  action: 'add' | 'remove' | 'update' | 'move'
  deck_id: string
  name: string
  set_code?: string
  collector_number?: string
  quantity?: number
  roles?: string[]
  status?: string
  ownership?: string
  to_alternates?: boolean
  to_sideboard?: boolean
  from_alternates?: boolean
  from_sideboard?: boolean
  add_roles?: string[]
  remove_roles?: string[]
  pinned?: boolean
  notes?: string
  from?: string
  to?: string
}

interface SearchCardsArgs {
  query: string
  exact?: boolean
  limit?: number
  set_code?: string
  collector_number?: string
}

interface ViewDeckArgs {
  deck_id: string
  view?: string
  sort_by?: string
  group_by?: string
  filters?: import('@mtg-deckbuilder/shared').CardFilter[]
}

interface ManageRoleArgs {
  action: 'add_custom' | 'add_global' | 'update_global' | 'delete_global'
  deck_id?: string
  id: string
  name?: string
  description?: string
  color?: string
}

interface SetCommandersArgs {
  deck_id: string
  commander_name: string
  set_code?: string
  collector_number?: string
}

interface ManageInterestListArgs {
  action: 'add' | 'remove'
  name?: string
  card_name?: string
  set_code?: string
  collector_number?: string
  notes?: string
  potential_decks?: string[]
  source?: string
}

interface ManageDeckNoteArgs {
  action: 'add' | 'update' | 'delete'
  deck_id: string
  note_id?: string
  title?: string
  content?: string
  note_type?: NoteType
  card_names?: string[]
  role_id?: string
  remove_role?: boolean
}

// Tool implementations

function listDecks(storage: Storage) {
  const decks = storage.listDecks()
  return decks.map((d) => ({
    id: d.id,
    name: d.name,
    format: d.format.type,
    cardCount: getCardCount(d),
    commanders: d.commanders.map((c) => c.name),
    updatedAt: d.updatedAt,
  }))
}

function getDeck(storage: Storage, identifier: string) {
  // Try by ID first
  let deck = storage.getDeck(identifier)
  if (!deck) {
    // Try by name
    deck = storage.getDeckByName(identifier)
  }
  if (!deck) {
    throw new Error(`Deck not found: ${identifier}`)
  }

  // Run validation and attach to response
  const validation = validateDeck(deck)

  return {
    ...deck,
    validation,
  }
}

function validateDeck(deck: Deck) {
  const issues: string[] = []
  const format = deck.format

  const cardCount = getCardCount(deck)
  if (cardCount < format.deckSize) {
    issues.push(`Deck has ${cardCount} cards, needs ${format.deckSize}`)
  } else if (cardCount > format.deckSize && format.type === 'commander') {
    issues.push(`Commander deck has ${cardCount} cards, should be exactly ${format.deckSize}`)
  }

  const sideboardCount = deck.sideboard.reduce((sum, c) => sum + c.quantity, 0)
  if (sideboardCount > format.sideboardSize) {
    issues.push(`Sideboard has ${sideboardCount} cards, max is ${format.sideboardSize}`)
  }

  const cardCounts = new Map<string, number>()
  for (const card of deck.cards) {
    const current = cardCounts.get(card.card.name) || 0
    cardCounts.set(card.card.name, current + card.quantity)
  }

  for (const [name, count] of cardCounts) {
    const limit = getCardLimit(name, format)
    if (count > limit && limit !== Infinity) {
      issues.push(`${name}: ${count} copies (limit: ${limit})`)
    }
  }

  if (format.type === 'commander' && deck.commanders.length === 0) {
    issues.push('No commander set for Commander format deck')
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      cardCount,
      deckSize: format.deckSize,
      sideboardCount,
      sideboardSize: format.sideboardSize,
      commanders: deck.commanders.map((c) => c.name),
    },
  }
}

function manageDeck(storage: Storage, args: ManageDeckArgs) {
  switch (args.action) {
    case 'create': {
      if (!args.name) throw new Error('name is required for create')
      if (!args.format) throw new Error('format is required for create')
      const formatType = args.format as FormatType
      if (!formatDefaults[formatType]) {
        throw new Error(`Invalid format: ${args.format}`)
      }
      const deck = createEmptyDeck(args.name, formatType)
      if (args.archetype) deck.archetype = args.archetype
      if (args.description) deck.description = args.description
      storage.saveDeck(deck)
      return { id: deck.id, name: deck.name, format: deck.format.type }
    }
    case 'update': {
      if (!args.deck_id) throw new Error('deck_id is required for update')
      const deck = storage.getDeck(args.deck_id)
      if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)
      if (args.name !== undefined) deck.name = args.name
      if (args.description !== undefined) deck.description = args.description
      if (args.archetype !== undefined) deck.archetype = args.archetype
      storage.saveDeck(deck)
      return { success: true, deck: { id: deck.id, name: deck.name } }
    }
    case 'delete': {
      if (!args.deck_id) throw new Error('deck_id is required for delete')
      const success = storage.deleteDeck(args.deck_id)
      if (!success) throw new Error(`Deck not found: ${args.deck_id}`)
      return { success: true, message: `Deck ${args.deck_id} deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

async function manageCard(storage: Storage, args: ManageCardArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

  switch (args.action) {
    case 'add': {
      let scryfallCard
      if (args.set_code && args.collector_number) {
        scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
      } else {
        scryfallCard = await searchCardByName(args.name)
      }
      if (!scryfallCard) throw new Error(`Card not found: ${args.name}`)

      const cardIdentifier: CardIdentifier = {
        scryfallId: scryfallCard.id,
        name: scryfallCard.name,
        setCode: scryfallCard.set,
        collectorNumber: scryfallCard.collector_number,
      }

      const deckCard: DeckCard = {
        id: generateDeckCardId(),
        card: cardIdentifier,
        quantity: args.quantity || 1,
        inclusion: (args.status as InclusionStatus) || 'confirmed',
        ownership: (args.ownership as OwnershipStatus) || 'need_to_buy',
        roles: args.roles || [],
        typeLine: scryfallCard.type_line,
        isPinned: false,
        addedAt: new Date().toISOString(),
        addedBy: 'user',
      }

      if (args.to_sideboard) {
        deck.sideboard.push(deckCard)
      } else if (args.to_alternates) {
        deck.alternates.push(deckCard)
      } else {
        deck.cards.push(deckCard)
      }

      storage.saveDeck(deck)
      return {
        success: true,
        card: {
          name: scryfallCard.name,
          set: scryfallCard.set,
          collectorNumber: scryfallCard.collector_number,
          quantity: deckCard.quantity,
        },
      }
    }
    case 'remove': {
      const targetList = args.from_sideboard
        ? deck.sideboard
        : args.from_alternates
          ? deck.alternates
          : deck.cards

      const cardIndex = targetList.findIndex(
        (c) => c.card.name.toLowerCase() === args.name.toLowerCase()
      )
      if (cardIndex === -1) throw new Error(`Card not found in deck: ${args.name}`)

      if (args.quantity && args.quantity < targetList[cardIndex].quantity) {
        targetList[cardIndex].quantity -= args.quantity
      } else {
        targetList.splice(cardIndex, 1)
      }

      storage.saveDeck(deck)
      return { success: true, message: `Removed ${args.name} from deck` }
    }
    case 'update': {
      let card: DeckCard | undefined
      for (const list of [deck.cards, deck.alternates, deck.sideboard]) {
        card = list.find((c) => c.card.name.toLowerCase() === args.name.toLowerCase())
        if (card) break
      }
      if (!card) throw new Error(`Card not found in deck: ${args.name}`)

      if (args.roles !== undefined) card.roles = args.roles
      if (args.add_roles) {
        card.roles = [...new Set([...card.roles, ...args.add_roles])]
      }
      if (args.remove_roles) {
        card.roles = card.roles.filter((r) => !args.remove_roles!.includes(r))
      }
      if (args.status !== undefined) card.inclusion = args.status as InclusionStatus
      if (args.ownership !== undefined) card.ownership = args.ownership as OwnershipStatus
      if (args.pinned !== undefined) card.isPinned = args.pinned
      if (args.notes !== undefined) card.notes = args.notes

      storage.saveDeck(deck)
      return { success: true, card: { name: card.card.name, roles: card.roles } }
    }
    case 'move': {
      if (!args.from || !args.to) throw new Error('from and to are required for move')

      const getList = (name: string): DeckCard[] => {
        switch (name) {
          case 'mainboard': return deck.cards
          case 'alternates': return deck.alternates
          case 'sideboard': return deck.sideboard
          default: throw new Error(`Invalid list: ${name}`)
        }
      }

      const fromList = getList(args.from)
      const toList = getList(args.to)

      const cardIndex = fromList.findIndex(
        (c) => c.card.name.toLowerCase() === args.name.toLowerCase()
      )
      if (cardIndex === -1) throw new Error(`Card not found in ${args.from}: ${args.name}`)

      const [card] = fromList.splice(cardIndex, 1)
      toList.push(card)

      storage.saveDeck(deck)
      return { success: true, message: `Moved ${args.name} from ${args.from} to ${args.to}` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

function formatCardResponse(scryfallCard: ScryfallCard) {
  return {
    name: scryfallCard.name,
    scryfallId: scryfallCard.id,
    manaCost: scryfallCard.mana_cost,
    cmc: scryfallCard.cmc,
    typeLine: scryfallCard.type_line,
    oracleText: scryfallCard.oracle_text,
    colors: scryfallCard.colors,
    colorIdentity: scryfallCard.color_identity,
    set: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
    rarity: scryfallCard.rarity,
    prices: scryfallCard.prices,
    legalities: scryfallCard.legalities,
  }
}

async function searchCardsHandler(args: SearchCardsArgs) {
  // If set_code + collector_number provided, fetch specific printing
  if (args.set_code && args.collector_number) {
    const scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
    if (!scryfallCard) throw new Error(`Card not found: ${args.set_code} ${args.collector_number}`)
    return formatCardResponse(scryfallCard)
  }

  // UUID pattern → fetch by ID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(args.query)) {
    const scryfallCard = await getCardById(args.query)
    if (!scryfallCard) throw new Error(`Card not found with ID: ${args.query}`)
    return formatCardResponse(scryfallCard)
  }

  // Scryfall search syntax → full search
  if (SCRYFALL_OPERATORS.test(args.query)) {
    const result = await searchCards(args.query)
    if (!result) throw new Error(`Search failed for query: ${args.query}`)
    const limit = args.limit ?? 10
    return {
      totalCards: result.total_cards,
      hasMore: result.data.length > limit,
      cards: result.data.slice(0, limit).map(formatCardResponse),
    }
  }

  // Otherwise → name lookup (fuzzy or exact)
  let scryfallCard
  if (args.exact) {
    scryfallCard = await searchCardByNameExact(args.query)
  } else {
    scryfallCard = await searchCardByName(args.query)
  }
  if (!scryfallCard) throw new Error(`Card not found: ${args.query}`)
  return formatCardResponse(scryfallCard)
}

function viewDeck(storage: Storage, args: ViewDeckArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

  const globalRoles = storage.getGlobalRoles()

  let scryfallCache: Map<string, ScryfallCard> | undefined
  if (args.view === 'curve' || (args.filters && args.filters.length > 0)) {
    scryfallCache = new Map()
    for (const card of deck.cards) {
      if (card.card.scryfallId) {
        const cached = storage.getCachedCard(card.card.scryfallId) as ScryfallCard | null
        if (cached) scryfallCache.set(card.card.scryfallId, cached)
      }
    }
  }

  return renderDeckView(deck, args.view || 'full', globalRoles, args.sort_by, args.group_by, args.filters, scryfallCache)
}

function listRoles(storage: Storage, deckId?: string) {
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

function manageRole(storage: Storage, args: ManageRoleArgs) {
  switch (args.action) {
    case 'add_custom': {
      if (!args.deck_id) throw new Error('deck_id is required for add_custom')
      if (!args.name) throw new Error('name is required for add_custom')
      const deck = storage.getDeck(args.deck_id)
      if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

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

async function setCommanders(storage: Storage, args: SetCommandersArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

  if (deck.format.type !== 'commander') {
    throw new Error('Commanders can only be set for Commander format decks')
  }

  let scryfallCard
  if (args.set_code && args.collector_number) {
    scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
  } else {
    scryfallCard = await searchCardByName(args.commander_name)
  }
  if (!scryfallCard) throw new Error(`Card not found: ${args.commander_name}`)

  const commander: CardIdentifier = {
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    setCode: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
  }

  const existingIndex = deck.commanders.findIndex(
    (c) => c.name.toLowerCase() === commander.name.toLowerCase()
  )
  if (existingIndex >= 0) throw new Error(`${commander.name} is already a commander`)

  deck.commanders.push(commander)
  deck.colorIdentity = scryfallCard.color_identity

  storage.saveDeck(deck)

  return {
    success: true,
    commanders: deck.commanders.map((c) => c.name),
    colorIdentity: deck.colorIdentity,
  }
}

function getInterestList(storage: Storage) {
  return storage.getInterestList()
}

async function manageInterestList(storage: Storage, args: ManageInterestListArgs) {
  switch (args.action) {
    case 'add': {
      if (!args.name) throw new Error('name is required for add')
      const interestList = storage.getInterestList()

      let scryfallCard
      if (args.set_code && args.collector_number) {
        scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
      } else {
        scryfallCard = await searchCardByName(args.name)
      }
      if (!scryfallCard) throw new Error(`Card not found: ${args.name}`)

      const item = {
        id: generateDeckCardId(),
        card: {
          scryfallId: scryfallCard.id,
          name: scryfallCard.name,
          setCode: scryfallCard.set,
          collectorNumber: scryfallCard.collector_number,
        },
        notes: args.notes,
        potentialDecks: args.potential_decks,
        addedAt: new Date().toISOString(),
        source: args.source,
      }

      interestList.items.push(item)
      storage.saveInterestList(interestList)
      return { success: true, item }
    }
    case 'remove': {
      if (!args.card_name) throw new Error('card_name is required for remove')
      const interestList = storage.getInterestList()
      const itemIndex = interestList.items.findIndex(
        (i) => i.card.name.toLowerCase() === args.card_name!.toLowerCase()
      )
      if (itemIndex === -1) throw new Error(`Card not found in interest list: ${args.card_name}`)

      interestList.items.splice(itemIndex, 1)
      storage.saveInterestList(interestList)
      return { success: true, message: `Removed ${args.card_name} from interest list` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

function listDeckNotes(storage: Storage, deckId: string) {
  const deck = storage.getDeck(deckId)
  if (!deck) throw new Error(`Deck not found: ${deckId}`)

  return deck.notes.map(n => ({
    id: n.id,
    title: n.title,
    noteType: n.noteType,
    cardRefs: n.cardRefs,
    roleId: n.roleId,
    content: n.content,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }))
}

function manageDeckNote(storage: Storage, args: ManageDeckNoteArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

  switch (args.action) {
    case 'add': {
      if (!args.title) throw new Error('title is required for add')
      if (!args.content) throw new Error('content is required for add')
      if (!args.note_type) throw new Error('note_type is required for add')

      const now = new Date().toISOString()
      const cardRefs: NoteCardRef[] = (args.card_names || []).map((name, i) => ({
        cardName: name,
        ordinal: i + 1,
      }))

      const note: DeckNote = {
        id: generateDeckCardId(),
        title: args.title,
        content: args.content,
        noteType: args.note_type,
        cardRefs,
        roleId: args.role_id,
        createdAt: now,
        updatedAt: now,
      }

      deck.notes.push(note)
      propagateNoteRole(deck, note)
      storage.saveDeck(deck)
      return { success: true, note }
    }
    case 'update': {
      if (!args.note_id) throw new Error('note_id is required for update')
      const note = deck.notes.find(n => n.id === args.note_id)
      if (!note) throw new Error(`Note not found: ${args.note_id}`)

      if (args.remove_role && note.roleId) {
        removeRoleFromNoteCards(deck, note)
      }

      if (args.title !== undefined) note.title = args.title
      if (args.content !== undefined) note.content = args.content
      if (args.note_type !== undefined) note.noteType = args.note_type
      if (args.card_names !== undefined) {
        note.cardRefs = args.card_names.map((name, i) => ({ cardName: name, ordinal: i + 1 }))
      }
      if (args.role_id !== undefined) note.roleId = args.role_id || undefined
      note.updatedAt = new Date().toISOString()

      propagateNoteRole(deck, note)
      storage.saveDeck(deck)
      return { success: true, note }
    }
    case 'delete': {
      if (!args.note_id) throw new Error('note_id is required for delete')
      const noteIndex = deck.notes.findIndex(n => n.id === args.note_id)
      if (noteIndex === -1) throw new Error(`Note not found: ${args.note_id}`)

      const note = deck.notes[noteIndex]
      if (args.remove_role && note.roleId) {
        removeRoleFromNoteCards(deck, note)
      }

      deck.notes.splice(noteIndex, 1)
      storage.saveDeck(deck)
      return { success: true, message: `Note "${note.title}" deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

function removeRoleFromNoteCards(deck: Deck, note: DeckNote): void {
  if (!note.roleId) return
  const refNames = new Set(note.cardRefs.map(r => r.cardName.toLowerCase()))
  const removeRole = (cards: DeckCard[]) => {
    for (const card of cards) {
      if (refNames.has(card.card.name.toLowerCase())) {
        card.roles = card.roles.filter(r => r !== note.roleId)
      }
    }
  }
  removeRole(deck.cards)
  removeRole(deck.alternates)
  removeRole(deck.sideboard)
}

function searchDecksForCard(storage: Storage, cardName: string) {
  const decks = storage.listDecks()
  const results: { deckId: string; deckName: string; location: string; quantity: number }[] = []

  for (const deck of decks) {
    for (const card of deck.cards) {
      if (card.card.name.toLowerCase().includes(cardName.toLowerCase())) {
        results.push({
          deckId: deck.id,
          deckName: deck.name,
          location: 'mainboard',
          quantity: card.quantity,
        })
      }
    }
    for (const card of deck.alternates) {
      if (card.card.name.toLowerCase().includes(cardName.toLowerCase())) {
        results.push({
          deckId: deck.id,
          deckName: deck.name,
          location: 'alternates',
          quantity: card.quantity,
        })
      }
    }
    for (const card of deck.sideboard) {
      if (card.card.name.toLowerCase().includes(cardName.toLowerCase())) {
        results.push({
          deckId: deck.id,
          deckName: deck.name,
          location: 'sideboard',
          quantity: card.quantity,
        })
      }
    }
    for (const commander of deck.commanders) {
      if (commander.name.toLowerCase().includes(cardName.toLowerCase())) {
        results.push({
          deckId: deck.id,
          deckName: deck.name,
          location: 'commander',
          quantity: 1,
        })
      }
    }
  }

  return results
}

function getBuyList(storage: Storage) {
  const decks = storage.listDecks()
  const buyList: {
    cardName: string
    setCode: string
    collectorNumber: string
    quantity: number
    decks: string[]
  }[] = []

  const cardMap = new Map<
    string,
    { setCode: string; collectorNumber: string; quantity: number; decks: string[] }
  >()

  for (const deck of decks) {
    for (const card of deck.cards) {
      if (card.ownership === 'need_to_buy') {
        const key = card.card.name.toLowerCase()
        const existing = cardMap.get(key)
        if (existing) {
          existing.quantity += card.quantity
          if (!existing.decks.includes(deck.name)) {
            existing.decks.push(deck.name)
          }
        } else {
          cardMap.set(key, {
            setCode: card.card.setCode,
            collectorNumber: card.card.collectorNumber,
            quantity: card.quantity,
            decks: [deck.name],
          })
        }
      }
    }
  }

  for (const [name, data] of cardMap) {
    buyList.push({
      cardName: name,
      setCode: data.setCode,
      collectorNumber: data.collectorNumber,
      quantity: data.quantity,
      decks: data.decks,
    })
  }

  return buyList.sort((a, b) => a.cardName.localeCompare(b.cardName))
}
