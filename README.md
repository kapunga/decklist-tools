# MTG Deckbuilder Tools

A monorepo suite of tools for managing Magic: The Gathering decks, consisting of:

1. **Shared Package** (`packages/shared`) - Common types, utilities, Scryfall client, and format parsers
2. **MCP Server** (`packages/mcp-server`) - TypeScript MCP server enabling Claude to help build and manage decks
3. **Electron App** (`packages/electron-app`) - Desktop application for visual deck management

All packages share the same JSON-based storage, allowing you to use Claude for deck building assistance while managing your collection visually in the desktop app.

## Prerequisites

- Node.js 20 or later
- pnpm 9

## Quick Start

```bash
pnpm install        # Install all dependencies (also builds shared package)
pnpm dev            # Launch Electron app with hot reload
```

## Storage Location

All packages store data in:
- **macOS:** `~/Library/Application Support/mtg-deckbuilder/`

```
mtg-deckbuilder/
├── config.json              # Application configuration
├── taxonomy.json            # Global tag taxonomy
├── global-roles.json        # Global role definitions
├── decks/
│   └── {uuid}.json          # Individual deck files
├── interest-list.json       # Cards of interest
└── cache/
    └── scryfall/
        └── {scryfall-id}.json  # Cached Scryfall card data
```

---

## Build Commands

```bash
pnpm build          # Build all packages in order
pnpm build:shared   # Build shared package (must be built first)
pnpm build:mcp      # Build MCP server
pnpm build:electron  # Build Electron app
pnpm dev            # Full Electron + hot reload
pnpm dev:mcp        # Run MCP server in development mode
pnpm typecheck      # TypeScript checking across all packages
pnpm test:mcp       # Run MCP server tests
pnpm clean          # Clean all build outputs
```

---

## MCP Server

The TypeScript MCP server enables Claude to help build and manage decks through natural conversation.

### Configuring with Claude Desktop

The easiest way is through the Electron app's Settings page — click **Connect to Claude Desktop** to automatically configure the MCP server.

Alternatively, add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "node",
      "args": ["/path/to/decklist-tools/packages/mcp-server/dist/main.js"]
    }
  }
}
```

### Available MCP Tools

#### Deck Management
- `list_decks` - List all saved decks
- `get_deck` - Get a deck by ID or name
- `create_deck` - Create a new empty deck
- `update_deck_metadata` - Update deck name, description, archetype, or strategy
- `delete_deck` - Delete a deck permanently

#### Card Management
- `add_card` - Add a card to a deck (resolves via Scryfall)
- `remove_card` - Remove a card from a deck
- `update_card` - Update a card's roles, status, ownership, etc.
- `move_card` - Move a card between mainboard, alternates, and sideboard
- `lookup_card` - Look up a card from Scryfall without adding to a deck

#### Views
- `view_deck` - Render a deck using a specific view format
- `list_views` - List available deck views

Built-in views: `full`, `skeleton`, `checklist`, `curve`, `buy-list`, `by-role`, `by-type`, `notes`

#### Roles
- `list_roles` - List all available roles
- `add_custom_role` - Add a custom role to a deck
- `add_global_role` - Add a new global role

#### Commander
- `set_commanders` - Set commander(s) and color identity

#### Notes
- `add_deck_note` - Add a note to a deck
- `update_deck_note` - Update an existing note
- `delete_deck_note` - Delete a note
- `list_deck_notes` - List all notes for a deck

#### Interest List
- `get_interest_list` - Get the full interest list
- `add_to_interest_list` - Add a card to the interest list
- `remove_from_interest_list` - Remove a card from the interest list

#### Import/Export
- `import_deck` - Import a decklist from text (Arena, Moxfield, Archidekt, MTGO, simple text)
- `export_deck` - Export a deck to a specific format
- `list_export_formats` - List available import/export formats

#### Validation & Search
- `validate_deck` - Check a deck against format rules
- `search_decks_for_card` - Find which decks contain a specific card
- `get_buy_list` - Get all cards marked "need_to_buy" across all decks

---

## Electron App

### Features

- **Deck List View** - Browse all your decks with format badges, card counts, and progress bars
- **Deck Detail View** - View and edit deck contents with grouping by role
- **Quick Add** - Type card names with Scryfall autocomplete
- **Card Management** - Change roles, ownership status, move between lists
- **Mana Curve** - Visualize mana distribution with filtering
- **Stats View** - See card distribution by role and cards needing purchase
- **Claude Desktop Integration** - One-click MCP server setup from Settings
- **File Watching** - Automatically reloads when MCP server modifies files

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+N | Create new deck |
| Esc | Go back to deck list |

---

## Usage Examples

### With Claude (via MCP)

```
User: Create a new Commander deck called "Isshin Attacks"

Claude: [Uses create_deck tool]
Created deck: Isshin Attacks (ID: abc-123-def)

User: Add Isshin, Two Heavens as One as the commander

Claude: [Uses set_commanders tool]
Set Isshin, Two Heavens as One as commander.

User: Show me the deck organized by role

Claude: [Uses view_deck tool with view=by-role]
# Isshin Attacks - By Role

## Commander (1)
- Isshin, Two Heavens as One
...
```

---

## Troubleshooting

### MCP Server not connecting

1. Ensure Node.js 20+ is installed: `node -v`
2. Rebuild: `pnpm build`
3. Check the path in `claude_desktop_config.json` is correct
4. Restart Claude Desktop after config changes

### Cards not found

The MCP server uses Scryfall's fuzzy search. If a card isn't found:
- Check spelling
- Use the full card name
- For specific printings, provide set code and collector number

### Data not syncing between apps

Both apps watch the same directory. If changes aren't appearing:
1. Check the storage directory exists: `ls ~/Library/Application\ Support/mtg-deckbuilder/`
2. Ensure file permissions allow read/write
3. Restart both applications

---

## License

MIT
