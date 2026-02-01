import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { getViewDescriptions } from '../views/index.js'

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
      description: 'Add, remove, update, or move cards in a deck. Supports batch operations via the `cards` array. For add: each entry is "[Nx ]<set_code> <collector_number>" (e.g. "fdn 542", "2x woe 138"). For remove/update/move: each entry is a card name.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'update', 'move'],
          },
          deck_id: { type: 'string' },
          cards: {
            type: 'array',
            items: { type: 'string' },
            description: 'Batch of cards. For add: "[Nx ]<set_code> <collector_number>" strings. For remove/update/move: card name strings.',
          },
          name: { type: 'string', description: 'Single card name (deprecated, use cards instead)' },
          // add params
          set_code: { type: 'string', description: 'Set code for single-card add (deprecated, use cards instead)' },
          collector_number: { type: 'string', description: 'Collector number for single-card add (deprecated, use cards instead)' },
          quantity: { type: 'number', default: 1, description: 'Quantity for single-card add (deprecated, use Nx prefix in cards instead)' },
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
        required: ['action', 'deck_id'],
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
          format: { type: 'string', enum: ['compact', 'json'], description: 'Output format (default: compact)' },
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
          detail: { type: 'string', enum: ['summary', 'compact', 'full'], description: 'Card detail level: summary (default, one-line), compact (adds oracle text), full (adds set/rarity)' },
          sort_by: { type: 'string' },
          group_by: { type: 'string' },
          filters: {
            type: 'array',
            description: 'Optional card filters to apply',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['cmc', 'color', 'card-type', 'role', 'ownership'] },
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
  ]
}
