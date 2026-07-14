import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { DECK_EXPORT_FORMATS } from './types.js'

// Reused by deck_list and deck_curve — a CardFilter JSON shape for trimming
// the card list shown in a rendered view.
const CARD_FILTER_SCHEMA = {
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
} as const

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
      description: 'Returns raw deck JSON with Scryfall IDs, metadata, and format validation. Use for programmatic operations or exporting. For deck evaluation/analysis, use view_deck instead.',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Deck UUID or name (case-insensitive)',
          },
          detail: {
            type: 'string',
            enum: ['summary', 'full'],
            description: 'Response detail level. `summary` (default) omits per-entry audit fields (id, addedAt, source) and collection-pull tracking (pulledPrintings) — suitable for deck analysis. `full` preserves every field, needed for surgical edit operations that reference entry IDs.',
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
            enum: ['commander', 'standard', 'modern', 'pioneer', 'legacy', 'pauper', 'kitchen_table'],
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
      description: 'Add, remove, update, or move cards in a deck.\n\n**Cards array**: Use `cards` for batch operations. For add: "[Nx ]<set_code> <collector_number>" (e.g. "fdn 542", "2x woe 138"). For remove/update/move: card names.\n\n**Action parameters**:\n- add: cards, roles, ownership, to_sideboard, to_alternates\n- remove: cards, quantity, from_sideboard, from_alternates\n- update: cards, roles, add_roles, remove_roles, ownership, notes\n- move: cards, from (required), to (required), quantity (required when source has >1 copies) — list names: mainboard, sideboard, alternates, cut',
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
          quantity: { type: 'number', description: 'For add: quantity of a single card (deprecated, use Nx prefix in cards instead, defaults to 1). For remove: number of copies to remove (defaults to all). For move: number of copies to move (required when the source entry has >1 copies; defaults to the full stack only for singletons).' },
          roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Role IDs (replaces all for update, initial for add)',
          },
          ownership: {
            type: 'string',
            enum: ['unknown', 'owned', 'need_to_buy'],
          },
          to_alternates: { type: 'boolean', description: 'Add to alternates list (add only)' },
          to_sideboard: { type: 'boolean', description: 'Add to sideboard (add only)' },
          // remove params
          from_alternates: { type: 'boolean', description: 'Remove from alternates list (remove only)' },
          from_sideboard: { type: 'boolean', description: 'Remove from sideboard (remove only)' },
          // update params
          add_roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Add these roles to existing roles (update only)',
          },
          remove_roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Remove these roles from existing roles (update only)',
          },
          notes: { type: 'string', description: 'Card notes (update only)' },
          // move params
          from: {
            type: 'string',
            enum: ['mainboard', 'alternates', 'sideboard', 'cut'],
            description: 'Source list (move only, required)',
          },
          to: {
            type: 'string',
            enum: ['mainboard', 'alternates', 'sideboard', 'cut'],
            description: 'Destination list (move only, required). Use "cut" to remove a card while preserving notes about why it was cut.',
          },
          force: {
            type: 'boolean',
            description: 'Skip the name/set+collector_number mismatch check. By default, supplying all three will error if the resolved printing does not match the supplied name. Set true to override.',
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

    // Views — one tool per view type. Start with deck_list for any deck analysis task.
    {
      name: 'deck_list',
      description: '**Primary deck-analysis view.** Returns the full card list as markdown, with Oracle text on every card by default. Supports grouping (`group_by`), sorting (`sort_by`), and filtering (`filters`). This is the right tool for almost any question about what a deck does or contains.',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          detail: {
            type: 'string',
            enum: ['summary', 'compact', 'full'],
            description: 'Card detail level. **Defaults to `compact`** — each card is listed with its Oracle text, which is what you want for deck analysis. Use `summary` for a terser one-line-per-card form when you only need names and quantities. Use `full` to additionally include set code and rarity.',
          },
          sort_by: { type: 'string', description: 'Sort key within each section. Supported values: `name`, `set`.' },
          group_by: { type: 'string', description: 'Group cards into sections. Supported values: `none` (default), `role`, `type`.' },
          filters: CARD_FILTER_SCHEMA,
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'deck_curve',
      description: 'Mana curve analysis for a deck: CMC distribution, color pip counts, and type breakdown. Use for mana-base and cost-curve questions.',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          filters: CARD_FILTER_SCHEMA,
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'deck_notes',
      description: 'Deck strategy notes: combos, synergies, themes, and game-plan commentary attached to a deck. Use when a user asks how a deck is *meant* to play.',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'deck_pull_list',
      description: 'Cards grouped by set for physical collection pulling, with pulled-status checkboxes. Use when preparing to physically assemble a deck from the user\'s collection.',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
        },
        required: ['deck_id'],
      },
    },
    {
      name: 'deck_export',
      description: 'Export a deck as text in one of the supported decklist formats: moxfield (Moxfield deck-import grammar), archidekt (Archidekt), simple (plain "N Card Name" text). Output is suitable for pasting into the matching site. Use the `section` option for tools (e.g. Moxfield) whose import UI accepts each section into a separate paste box.',
      inputSchema: {
        type: 'object',
        properties: {
          deck_id: { type: 'string' },
          format: {
            type: 'string',
            enum: [...DECK_EXPORT_FORMATS],
            description: 'Target export format.',
          },
          include_sideboard: { type: 'boolean', description: 'Include sideboard section (default true).' },
          include_maybeboard: { type: 'boolean', description: 'Include maybeboard section (default true).' },
          section: {
            type: 'string',
            enum: ['mainboard', 'sideboard', 'maybeboard'],
            description: 'Emit only the named section. Useful for Moxfield-style imports where each section pastes into a separate UI box. Omit to emit the full deck.',
          },
        },
        required: ['deck_id', 'format'],
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
      description: 'Add, update, or delete roles. Actions: add_custom (deck-specific), update_custom, delete_custom, add_global, update_global, delete_global.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add_custom', 'add_global', 'update_global', 'delete_global', 'update_custom', 'delete_custom'],
          },
          deck_id: { type: 'string', description: 'Required for add_custom, update_custom, delete_custom' },
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
      name: 'manage_commander',
      description: 'Add, remove, or swap commanders for a Commander format deck.\n\n**Actions**:\n- add: Add a commander to the deck\n- remove: Remove a commander from the deck\n- swap: Replace an existing commander with a new one (requires new_commander_name)',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'swap'],
          },
          deck_id: { type: 'string' },
          commander_name: {
            type: 'string',
            description: 'Commander card name (to add, remove, or replace)',
          },
          set_code: { type: 'string', description: 'Set code for add/remove' },
          collector_number: { type: 'string', description: 'Collector number for add/remove' },
          new_commander_name: {
            type: 'string',
            description: 'New commander name (swap only, required)',
          },
          new_set_code: { type: 'string', description: 'Set code for new commander (swap only)' },
          new_collector_number: { type: 'string', description: 'Collector number for new commander (swap only)' },
          force: {
            type: 'boolean',
            description: 'Skip the name/set+collector_number mismatch check. By default, supplying all three will error if the resolved printing does not match the supplied name. Set true to override.',
          },
        },
        required: ['action', 'deck_id', 'commander_name'],
      },
    },

    // Card Lists
    {
      name: 'list_card_lists',
      description: 'List all saved card lists with id, name, kind, description, and card count. Card lists are generic named card collections used for purposes like an interest list, a scanned partial-set pool, a wishlist, or a tracked collection.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_card_list',
      description: 'Get a single card list with all entries. The identifier may be the list UUID or the (case-insensitive) list name.',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'List UUID or name' },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'manage_card_list',
      description: 'Create, rename, or delete a card list, or add/remove cards within a list.\n\n**Actions:**\n- create: requires `name`; optional `kind` (interest, collection, scan, wishlist, custom — defaults to custom) and `description`.\n- delete: requires `id`. The well-known interest list cannot be deleted.\n- rename: requires `id` and `name`; optional `description`.\n- add: requires `id` and `name` (card name). Set/collector are optional. Optional `quantity`, `notes`, `potential_decks`, `source`.\n- remove: requires `id` and `card_name`.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'delete', 'rename', 'add', 'remove'],
          },
          id: { type: 'string', description: 'List UUID (required for delete, rename, add, remove)' },
          name: { type: 'string', description: 'For create/rename: the list name. For add: the card name to add.' },
          description: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['interest', 'collection', 'scan', 'wishlist', 'custom'],
            description: 'List kind (create only). Defaults to custom.',
          },
          card_name: { type: 'string', description: 'Card name to remove (required for remove)' },
          set_code: { type: 'string' },
          collector_number: { type: 'string' },
          notes: { type: 'string' },
          potential_decks: {
            type: 'array',
            items: { type: 'string' },
          },
          source: { type: 'string' },
          quantity: { type: 'number' },
          force: {
            type: 'boolean',
            description: 'Skip the name/set+collector_number mismatch check. By default, supplying all three will error if the resolved printing does not match the supplied name. Set true to override.',
          },
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

    // Collection Filter
    {
      name: 'get_collection_filter',
      description: 'Generate a Scryfall filter string scoped to the sets in the user\'s set collection (set only — no rarity filtering). Each returned set also carries its collection `level` (1-4) and the `rarities` typically associated with that level: a hint for judging ownership likelihood by comparing against each search result\'s own `rarity`, not a hard filter. A card above a set\'s level can still be owned.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },

    // Skill inventory
    {
      name: 'list_bundled_skills',
      description: 'Lists the SKILL.md skills bundled with the currently-running mtg-deckbuilder app, with their name, version (date), and description. Use this to check whether installed copies of mtg-deckbuilder skills (in ~/.claude/skills, ~/.gemini/skills, Claude Desktop\'s Capabilities, etc.) are up to date — compare the returned `version` against the `metadata.version` in your local SKILL.md and reinstall if newer. Returns `skills_dir_configured: false` if the server was not started with a `--skills-dir` flag.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ]
}
