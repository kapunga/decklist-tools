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
  getCardBySetAndNumber,
  formats,
  getFormat,
  detectFormat,
} from '@mtg-deckbuilder/shared'

import { renderDeckView, getViewDescriptions } from '../views/index.js'

// Tool definitions
export function getToolDefinitions(): Tool[] {
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
      description: 'Get a deck by ID or name',
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
      name: 'create_deck',
      description: 'Create a new empty deck',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          format: {
            type: 'string',
            enum: ['commander', 'standard', 'modern', 'kitchen_table'],
          },
          archetype: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'format'],
      },
    },
    {
      name: 'update_deck_metadata',
      description: 'Update deck name, description, or archetype',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          archetype: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'delete_deck',
      description: 'Delete a deck permanently',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },

    // Card Management
    {
      name: 'add_card',
      description: 'Add a card to a deck. Resolves card via Scryfall.',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          name: { type: 'string' },
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
          quantity: { type: 'number', default: 1 },
          roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of role IDs for the card',
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
        },
        required: ['deck_id', 'name'],
      },
    },
    {
      name: 'remove_card',
      description: 'Remove a card from a deck',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          name: { type: 'string' },
          quantity: { type: 'number' },
          from_alternates: { type: 'boolean' },
          from_sideboard: { type: 'boolean' },
        },
        required: ['deck_id', 'name'],
      },
    },
    {
      name: 'update_card',
      description: "Update a card's metadata in a deck",
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          name: { type: 'string' },
          roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Replace all roles with this list',
          },
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
          status: { type: 'string' },
          ownership: { type: 'string' },
          pinned: { type: 'boolean' },
          notes: { type: 'string' },
        },
        required: ['deck_id', 'name'],
      },
    },
    {
      name: 'move_card',
      description: 'Move a card between mainboard, alternates, and sideboard',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          name: { type: 'string' },
          from: {
            type: 'string',
            enum: ['mainboard', 'alternates', 'sideboard'],
          },
          to: {
            type: 'string',
            enum: ['mainboard', 'alternates', 'sideboard'],
          },
        },
        required: ['deck_id', 'name', 'from', 'to'],
      },
    },
    {
      name: 'lookup_card',
      description: 'Look up a card from Scryfall without adding to a deck',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
        },
        required: ['name'],
      },
    },

    // Views
    {
      name: 'view_deck',
      description: 'Render a deck using a specific view format',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          view: { type: 'string', default: 'full' },
          sort_by: { type: 'string' },
          group_by: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'list_views',
      description: 'List available deck views',
      inputSchema: {
        type: 'object',
        properties: {},
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
      name: 'add_custom_role',
      description: "Add a custom role to a deck's role definitions",
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
        },
        required: ['deck_id', 'id', 'name'],
      },
    },
    {
      name: 'add_global_role',
      description: 'Add a new global role',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique role ID (lowercase with hyphens)',
          },
          name: {
            type: 'string',
            description: 'Display name for the role',
          },
          description: {
            type: 'string',
            description: 'Description of what this role represents',
          },
          color: {
            type: 'string',
            description: 'Hex color code (e.g., #ef4444)',
          },
        },
        required: ['id', 'name'],
      },
    },
    {
      name: 'update_global_role',
      description: 'Update an existing global role',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Role ID to update' },
          name: { type: 'string', description: 'New display name' },
          description: { type: 'string', description: 'New description' },
          color: { type: 'string', description: 'New hex color code' },
        },
        required: ['id'],
      },
    },
    {
      name: 'delete_global_role',
      description: 'Delete a global role',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Role ID to delete' },
        },
        required: ['id'],
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
      name: 'add_to_interest_list',
      description: 'Add a card to the interest list',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
          notes: { type: 'string' },
          potential_decks: {
            type: 'array',
            items: { type: 'string' },
          },
          source: { type: 'string' },
        },
        required: ['name'],
      },
    },
    {
      name: 'remove_from_interest_list',
      description: 'Remove a card from the interest list',
      inputSchema: {
        type: 'object',
        properties: {
          card_name: { type: 'string' },
        },
        required: ['card_name'],
      },
    },

    // Import/Export
    {
      name: 'import_deck',
      description: 'Import a decklist from text',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          name: { type: 'string' },
          format: { type: 'string' },
          text: { type: 'string' },
          source_format: {
            type: 'string',
            enum: ['arena', 'moxfield', 'archidekt', 'mtgo', 'simple', 'auto'],
          },
        },
        required: ['text'],
      },
    },
    {
      name: 'export_deck',
      description: 'Export a deck to a specific format',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          format: {
            type: 'string',
            enum: ['arena', 'moxfield', 'archidekt', 'mtgo', 'simple'],
          },
          include_maybeboard: { type: 'boolean', default: false },
          include_sideboard: { type: 'boolean', default: true },
        },
        required: ['deck_id', 'format'],
      },
    },
    {
      name: 'list_export_formats',
      description: 'List available import/export formats',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },

    // Notes
    {
      name: 'add_deck_note',
      description: 'Add a note to a deck documenting combos, synergies, or strategy',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
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
        },
        required: ['deck_id', 'title', 'content', 'note_type'],
      },
    },
    {
      name: 'update_deck_note',
      description: 'Update an existing deck note',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          note_id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          note_type: {
            type: 'string',
            enum: ['combo', 'synergy', 'theme', 'strategy', 'general'],
          },
          card_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Replace card refs with this ordered list',
          },
          role_id: { type: 'string' },
          remove_role: { type: 'boolean', description: 'Remove the note role from associated cards' },
        },
        required: ['deck_id', 'note_id'],
      },
    },
    {
      name: 'delete_deck_note',
      description: 'Delete a deck note',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          note_id: { type: 'string' },
          remove_role: { type: 'boolean', description: 'Remove the note role from associated cards (default false)' },
        },
        required: ['deck_id', 'note_id'],
      },
    },
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

    // Validation
    {
      name: 'validate_deck',
      description: 'Check a deck against format rules',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },

    // Search
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
    case 'create_deck':
      return createDeck(storage, args as unknown as CreateDeckArgs)
    case 'update_deck_metadata':
      return updateDeckMetadata(storage, args as unknown as UpdateDeckMetadataArgs)
    case 'delete_deck':
      return deleteDeck(storage, args.deck_id as string)
    case 'add_card':
      return addCard(storage, args as unknown as AddCardArgs)
    case 'remove_card':
      return removeCard(storage, args as unknown as RemoveCardArgs)
    case 'update_card':
      return updateCard(storage, args as unknown as UpdateCardArgs)
    case 'move_card':
      return moveCard(storage, args as unknown as MoveCardArgs)
    case 'lookup_card':
      return lookupCard(args as unknown as LookupCardArgs)
    case 'view_deck':
      return viewDeck(storage, args as unknown as ViewDeckArgs)
    case 'list_views':
      return listViews()
    case 'list_roles':
      return listRoles(storage, args.deck_id as string | undefined)
    case 'add_custom_role':
      return addCustomRole(storage, args as unknown as AddCustomRoleArgs)
    case 'add_global_role':
      return addGlobalRole(storage, args as unknown as AddGlobalRoleArgs)
    case 'update_global_role':
      return updateGlobalRole(storage, args as unknown as UpdateGlobalRoleArgs)
    case 'delete_global_role':
      return deleteGlobalRole(storage, args.id as string)
    case 'set_commanders':
      return setCommanders(storage, args as unknown as SetCommandersArgs)
    case 'get_interest_list':
      return getInterestList(storage)
    case 'add_to_interest_list':
      return addToInterestList(storage, args as unknown as AddToInterestListArgs)
    case 'remove_from_interest_list':
      return removeFromInterestList(storage, args.card_name as string)
    case 'add_deck_note':
      return addDeckNote(storage, args as unknown as AddDeckNoteArgs)
    case 'update_deck_note':
      return updateDeckNote(storage, args as unknown as UpdateDeckNoteArgs)
    case 'delete_deck_note':
      return deleteDeckNote(storage, args as unknown as DeleteDeckNoteArgs)
    case 'list_deck_notes':
      return listDeckNotes(storage, args.deck_id as string)
    case 'import_deck':
      return importDeck(storage, args as unknown as ImportDeckArgs)
    case 'export_deck':
      return exportDeck(storage, args as unknown as ExportDeckArgs)
    case 'list_export_formats':
      return listExportFormats()
    case 'validate_deck':
      return validateDeck(storage, args.deck_id as string)
    case 'search_decks_for_card':
      return searchDecksForCard(storage, args.card_name as string)
    case 'get_buy_list':
      return getBuyList(storage)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// Type definitions for tool arguments
interface CreateDeckArgs {
  name: string
  format: string
  archetype?: string
  description?: string
}

interface UpdateDeckMetadataArgs {
  deck_id: string
  name?: string
  description?: string
  archetype?: string
}

interface AddCardArgs {
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
}

interface RemoveCardArgs {
  deck_id: string
  name: string
  quantity?: number
  from_alternates?: boolean
  from_sideboard?: boolean
}

interface UpdateCardArgs {
  deck_id: string
  name: string
  roles?: string[]
  add_roles?: string[]
  remove_roles?: string[]
  status?: string
  ownership?: string
  pinned?: boolean
  notes?: string
}

interface MoveCardArgs {
  deck_id: string
  name: string
  from: string
  to: string
}

interface LookupCardArgs {
  name: string
  set_code?: string
  collector_number?: string
}

interface ViewDeckArgs {
  deck_id: string
  view?: string
  sort_by?: string
  group_by?: string
}

interface AddCustomRoleArgs {
  deck_id: string
  id: string
  name: string
  description?: string
  color?: string
}

interface AddGlobalRoleArgs {
  id: string
  name: string
  description?: string
  color?: string
}

interface UpdateGlobalRoleArgs {
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

interface AddToInterestListArgs {
  name: string
  set_code?: string
  collector_number?: string
  notes?: string
  potential_decks?: string[]
  source?: string
}

interface ImportDeckArgs {
  deck_id?: string
  name?: string
  format?: string
  text: string
  source_format?: string
}

interface ExportDeckArgs {
  deck_id: string
  format: string
  include_maybeboard?: boolean
  include_sideboard?: boolean
}

interface AddDeckNoteArgs {
  deck_id: string
  title: string
  content: string
  note_type: NoteType
  card_names?: string[]
  role_id?: string
}

interface UpdateDeckNoteArgs {
  deck_id: string
  note_id: string
  title?: string
  content?: string
  note_type?: NoteType
  card_names?: string[]
  role_id?: string
  remove_role?: boolean
}

interface DeleteDeckNoteArgs {
  deck_id: string
  note_id: string
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
  return deck
}

function createDeck(storage: Storage, args: CreateDeckArgs) {
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

function updateDeckMetadata(storage: Storage, args: UpdateDeckMetadataArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  if (args.name !== undefined) deck.name = args.name
  if (args.description !== undefined) deck.description = args.description
  if (args.archetype !== undefined) deck.archetype = args.archetype

  storage.saveDeck(deck)
  return { success: true, deck: { id: deck.id, name: deck.name } }
}

function deleteDeck(storage: Storage, deckId: string) {
  const success = storage.deleteDeck(deckId)
  if (!success) {
    throw new Error(`Deck not found: ${deckId}`)
  }
  return { success: true, message: `Deck ${deckId} deleted` }
}

async function addCard(storage: Storage, args: AddCardArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  // Resolve card via Scryfall
  let scryfallCard
  if (args.set_code && args.collector_number) {
    scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
  } else {
    scryfallCard = await searchCardByName(args.name)
  }

  if (!scryfallCard) {
    throw new Error(`Card not found: ${args.name}`)
  }

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

  // Add to appropriate list
  if (args.to_sideboard) {
    deck.sideboard.push(deckCard)
  } else if (args.to_alternates) {
    deck.alternates.push(deckCard)
  } else {
    deck.cards.push(deckCard)
  }

  // Update color identity for commander
  if (deck.format.type === 'commander' && deck.commanders.length > 0) {
    // Color identity is derived from commander(s)
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

function removeCard(storage: Storage, args: RemoveCardArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  const targetList = args.from_sideboard
    ? deck.sideboard
    : args.from_alternates
      ? deck.alternates
      : deck.cards

  const cardIndex = targetList.findIndex(
    (c) => c.card.name.toLowerCase() === args.name.toLowerCase()
  )

  if (cardIndex === -1) {
    throw new Error(`Card not found in deck: ${args.name}`)
  }

  if (args.quantity && args.quantity < targetList[cardIndex].quantity) {
    targetList[cardIndex].quantity -= args.quantity
  } else {
    targetList.splice(cardIndex, 1)
  }

  storage.saveDeck(deck)
  return { success: true, message: `Removed ${args.name} from deck` }
}

function updateCard(storage: Storage, args: UpdateCardArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  // Find card in any list
  let card: DeckCard | undefined
  for (const list of [deck.cards, deck.alternates, deck.sideboard]) {
    card = list.find((c) => c.card.name.toLowerCase() === args.name.toLowerCase())
    if (card) break
  }

  if (!card) {
    throw new Error(`Card not found in deck: ${args.name}`)
  }

  // Update roles
  if (args.roles !== undefined) {
    card.roles = args.roles
  }
  if (args.add_roles) {
    card.roles = [...new Set([...card.roles, ...args.add_roles])]
  }
  if (args.remove_roles) {
    card.roles = card.roles.filter((r) => !args.remove_roles!.includes(r))
  }

  // Update other fields
  if (args.status !== undefined) {
    card.inclusion = args.status as InclusionStatus
  }
  if (args.ownership !== undefined) {
    card.ownership = args.ownership as OwnershipStatus
  }
  if (args.pinned !== undefined) {
    card.isPinned = args.pinned
  }
  if (args.notes !== undefined) {
    card.notes = args.notes
  }

  storage.saveDeck(deck)
  return { success: true, card: { name: card.card.name, roles: card.roles } }
}

function moveCard(storage: Storage, args: MoveCardArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  const getList = (name: string): DeckCard[] => {
    switch (name) {
      case 'mainboard':
        return deck.cards
      case 'alternates':
        return deck.alternates
      case 'sideboard':
        return deck.sideboard
      default:
        throw new Error(`Invalid list: ${name}`)
    }
  }

  const fromList = getList(args.from)
  const toList = getList(args.to)

  const cardIndex = fromList.findIndex(
    (c) => c.card.name.toLowerCase() === args.name.toLowerCase()
  )

  if (cardIndex === -1) {
    throw new Error(`Card not found in ${args.from}: ${args.name}`)
  }

  const [card] = fromList.splice(cardIndex, 1)
  toList.push(card)

  storage.saveDeck(deck)
  return { success: true, message: `Moved ${args.name} from ${args.from} to ${args.to}` }
}

async function lookupCard(args: LookupCardArgs) {
  let scryfallCard
  if (args.set_code && args.collector_number) {
    scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
  } else {
    scryfallCard = await searchCardByName(args.name)
  }

  if (!scryfallCard) {
    throw new Error(`Card not found: ${args.name}`)
  }

  return {
    name: scryfallCard.name,
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

function viewDeck(storage: Storage, args: ViewDeckArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  const globalRoles = storage.getGlobalRoles()
  return renderDeckView(deck, args.view || 'full', globalRoles, args.sort_by, args.group_by)
}

function listViews() {
  return getViewDescriptions()
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

function addCustomRole(storage: Storage, args: AddCustomRoleArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  const role: RoleDefinition = {
    id: args.id,
    name: args.name,
    description: args.description,
    color: args.color,
  }

  // Check if role already exists
  if (deck.customRoles.some((r) => r.id === args.id)) {
    throw new Error(`Role already exists: ${args.id}`)
  }

  deck.customRoles.push(role)
  storage.saveDeck(deck)

  return { success: true, role }
}

function addGlobalRole(storage: Storage, args: AddGlobalRoleArgs) {
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

function updateGlobalRole(storage: Storage, args: UpdateGlobalRoleArgs) {
  const roles = storage.getGlobalRoles()
  const roleIndex = roles.findIndex((r) => r.id === args.id)

  if (roleIndex === -1) {
    throw new Error(`Role not found: ${args.id}`)
  }

  if (args.name !== undefined) roles[roleIndex].name = args.name
  if (args.description !== undefined) roles[roleIndex].description = args.description
  if (args.color !== undefined) roles[roleIndex].color = args.color

  storage.saveGlobalRoles(roles)

  return { success: true, role: roles[roleIndex] }
}

function deleteGlobalRole(storage: Storage, id: string) {
  const roles = storage.getGlobalRoles()
  const roleIndex = roles.findIndex((r) => r.id === id)

  if (roleIndex === -1) {
    throw new Error(`Role not found: ${id}`)
  }

  roles.splice(roleIndex, 1)
  storage.saveGlobalRoles(roles)

  return { success: true, message: `Role ${id} deleted` }
}

async function setCommanders(storage: Storage, args: SetCommandersArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  if (deck.format.type !== 'commander') {
    throw new Error('Commanders can only be set for Commander format decks')
  }

  // Resolve commander via Scryfall
  let scryfallCard
  if (args.set_code && args.collector_number) {
    scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
  } else {
    scryfallCard = await searchCardByName(args.commander_name)
  }

  if (!scryfallCard) {
    throw new Error(`Card not found: ${args.commander_name}`)
  }

  const commander: CardIdentifier = {
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    setCode: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
  }

  // Check if already a commander
  const existingIndex = deck.commanders.findIndex(
    (c) => c.name.toLowerCase() === commander.name.toLowerCase()
  )

  if (existingIndex >= 0) {
    throw new Error(`${commander.name} is already a commander`)
  }

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

async function addToInterestList(storage: Storage, args: AddToInterestListArgs) {
  const interestList = storage.getInterestList()

  // Resolve card via Scryfall
  let scryfallCard
  if (args.set_code && args.collector_number) {
    scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
  } else {
    scryfallCard = await searchCardByName(args.name)
  }

  if (!scryfallCard) {
    throw new Error(`Card not found: ${args.name}`)
  }

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

function removeFromInterestList(storage: Storage, cardName: string) {
  const interestList = storage.getInterestList()
  const itemIndex = interestList.items.findIndex(
    (i) => i.card.name.toLowerCase() === cardName.toLowerCase()
  )

  if (itemIndex === -1) {
    throw new Error(`Card not found in interest list: ${cardName}`)
  }

  interestList.items.splice(itemIndex, 1)
  storage.saveInterestList(interestList)

  return { success: true, message: `Removed ${cardName} from interest list` }
}

function addDeckNote(storage: Storage, args: AddDeckNoteArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

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

function updateDeckNote(storage: Storage, args: UpdateDeckNoteArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

  const note = deck.notes.find(n => n.id === args.note_id)
  if (!note) throw new Error(`Note not found: ${args.note_id}`)

  // If removing role, remove it from associated cards first
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

function deleteDeckNote(storage: Storage, args: DeleteDeckNoteArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

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

async function importDeck(storage: Storage, args: ImportDeckArgs) {
  // Detect or use specified format
  const sourceFormat =
    args.source_format === 'auto' || !args.source_format
      ? detectFormat(args.text)
      : getFormat(args.source_format)

  if (!sourceFormat) {
    throw new Error(`Unknown format: ${args.source_format}`)
  }

  // Parse the text
  const parsedCards = sourceFormat.parse(args.text)

  if (parsedCards.length === 0) {
    throw new Error('No cards found in import text')
  }

  // Get or create deck
  let deck: Deck
  if (args.deck_id) {
    const existingDeck = storage.getDeck(args.deck_id)
    if (!existingDeck) {
      throw new Error(`Deck not found: ${args.deck_id}`)
    }
    deck = existingDeck
  } else {
    const formatType = (args.format as FormatType) || 'commander'
    deck = createEmptyDeck(args.name || 'Imported Deck', formatType)
  }

  // Add cards
  const results = {
    added: [] as string[],
    failed: [] as { name: string; error: string }[],
  }

  for (const parsed of parsedCards) {
    try {
      // Resolve card via Scryfall
      let scryfallCard
      if (parsed.setCode && parsed.collectorNumber) {
        scryfallCard = await getCardBySetAndNumber(parsed.setCode, parsed.collectorNumber)
      } else {
        scryfallCard = await searchCardByName(parsed.name)
      }

      if (!scryfallCard) {
        results.failed.push({ name: parsed.name, error: 'Card not found' })
        continue
      }

      const cardIdentifier: CardIdentifier = {
        scryfallId: scryfallCard.id,
        name: scryfallCard.name,
        setCode: scryfallCard.set,
        collectorNumber: scryfallCard.collector_number,
      }

      const deckCard: DeckCard = {
        id: generateDeckCardId(),
        card: cardIdentifier,
        quantity: parsed.quantity,
        inclusion: parsed.isMaybeboard ? 'considering' : 'confirmed',
        ownership: 'need_to_buy',
        roles: parsed.roles,
        typeLine: scryfallCard.type_line,
        isPinned: false,
        addedAt: new Date().toISOString(),
        addedBy: 'import',
      }

      if (parsed.isCommander) {
        deck.commanders.push(cardIdentifier)
        deck.colorIdentity = scryfallCard.color_identity
      } else if (parsed.isSideboard) {
        deck.sideboard.push(deckCard)
      } else if (parsed.isMaybeboard) {
        deck.alternates.push(deckCard)
      } else {
        deck.cards.push(deckCard)
      }

      results.added.push(scryfallCard.name)
    } catch (error) {
      results.failed.push({
        name: parsed.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  storage.saveDeck(deck)

  return {
    success: true,
    deckId: deck.id,
    deckName: deck.name,
    cardsAdded: results.added.length,
    cardsFailed: results.failed.length,
    details: results,
  }
}

function exportDeck(storage: Storage, args: ExportDeckArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) {
    throw new Error(`Deck not found: ${args.deck_id}`)
  }

  const format = getFormat(args.format)
  if (!format) {
    throw new Error(`Unknown format: ${args.format}`)
  }

  const text = format.render(deck, {
    includeMaybeboard: args.include_maybeboard,
    includeSideboard: args.include_sideboard,
  })

  return { format: args.format, text }
}

function listExportFormats() {
  return formats.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
  }))
}

function validateDeck(storage: Storage, deckId: string) {
  const deck = storage.getDeck(deckId)
  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  const issues: string[] = []
  const format = deck.format

  // Check deck size
  const cardCount = getCardCount(deck)
  if (cardCount < format.deckSize) {
    issues.push(`Deck has ${cardCount} cards, needs ${format.deckSize}`)
  } else if (cardCount > format.deckSize && format.type === 'commander') {
    issues.push(`Commander deck has ${cardCount} cards, should be exactly ${format.deckSize}`)
  }

  // Check sideboard size
  const sideboardCount = deck.sideboard.reduce((sum, c) => sum + c.quantity, 0)
  if (sideboardCount > format.sideboardSize) {
    issues.push(`Sideboard has ${sideboardCount} cards, max is ${format.sideboardSize}`)
  }

  // Check card limits
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

  // Check for commander in Commander format
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
