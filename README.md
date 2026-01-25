# MTG Deckbuilder Tools

A suite of tools for managing Magic: The Gathering decks, consisting of:

1. **MCP Server** (Scala) - Enables Claude to help build and manage decks through natural conversation
2. **Electron App** (React/TypeScript) - Desktop application for visual deck management

Both applications share the same storage format, allowing you to use Claude for deck building assistance while managing your collection visually in the desktop app.

## Prerequisites

### For the MCP Server
- Java 17 or later (JDK)
- sbt (Scala Build Tool) - [Installation guide](https://www.scala-sbt.org/download.html)

### For the Electron App
- Node.js 18 or later
- npm or yarn

## Storage Location

Both applications store data in:
- **macOS:** `~/Library/Application Support/mtg-deckbuilder/`

```
mtg-deckbuilder/
├── config.json              # Application configuration
├── taxonomy.json            # Global tag taxonomy
├── decks/
│   └── {uuid}.json          # Individual deck files
├── interest-list.json       # Cards of interest
└── cache/
    └── scryfall/
        └── {scryfall-id}.json  # Cached Scryfall card data
```

---

## MCP Server Setup

### Building

```bash
cd mcp-server
sbt assembly
```

This creates a fat JAR at `target/scala-3.3.1/mtg-deckbuilder-mcp.jar`.

### Running Tests

```bash
cd mcp-server
sbt test
```

### Running Manually

```bash
# Using the run script
./run.sh

# Or directly with java
java -jar target/scala-3.3.1/mtg-deckbuilder-mcp.jar
```

### Configuring with Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Option 1: Using the run script (recommended)**

```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "/path/to/mcp-server/run.sh"
    }
  }
}
```

**Option 2: Using java directly**

```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "java",
      "args": [
        "-jar",
        "/path/to/mcp-server/target/scala-3.3.1/mtg-deckbuilder-mcp.jar"
      ]
    }
  }
}
```

Replace `/path/to/mcp-server` with the actual path to your mcp-server directory.

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
- `update_card` - Update a card's role, tags, status, ownership, etc.
- `move_card` - Move a card between mainboard, alternates, and sideboard
- `lookup_card` - Look up a card from Scryfall without adding to a deck

#### Views
- `view_deck` - Render a deck using a specific view format
- `list_views` - List available deck views

Built-in views: `full`, `skeleton`, `checklist`, `curve`, `buy-list`, `by-role`, `by-function`

#### Tags
- `list_tags` - List all available tags
- `add_custom_tag` - Add a custom tag to a deck
- `add_global_tag` - Add a new global tag to the taxonomy

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

## Electron App Setup

### Installing Dependencies

```bash
cd electron-app
npm install
```

### Development Mode

```bash
npm run electron:dev
```

This starts the Vite dev server and launches Electron with hot reload.

### Building for Production

```bash
npm run build
```

This builds the app and creates distributable packages in the `release/` directory.

### Features

- **Deck List View** - Browse all your decks with format badges, card counts, and progress bars
- **Deck Detail View** - View and edit deck contents with grouping by role
- **Quick Add** - Type card names with Scryfall autocomplete
- **Card Management** - Change roles, ownership status, move between lists
- **Stats View** - See card distribution by role and cards needing purchase
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

Claude: [Uses add_card tool with role=commander]
Added Isshin, Two Heavens as One to the deck.

User: Show me the deck organized by role

Claude: [Uses view_deck tool with view=by-role]
# Isshin Attacks - By Role

## Commander (1)
- Isshin, Two Heavens as One
...
```

### Importing a Decklist

```
User: Import this deck:
1 Isshin, Two Heavens as One (NEO) 226
1 Aurelia, the Warleader (GTC) 143
1 Combat Celebrant (AKH) 125
...

Claude: [Uses import_deck tool]
Created deck with 3 cards. All cards resolved successfully.
```

---

## Development

### MCP Server (Scala)

```bash
cd mcp-server
sbt compile        # Compile
sbt test           # Run tests
sbt assembly       # Build fat JAR
sbt run            # Run directly
```

### Electron App

```bash
cd electron-app
npm run dev              # Start Vite dev server only
npm run electron:dev     # Start with Electron
npm run typecheck        # Type check TypeScript
npm run build            # Build for production
```

---

## Troubleshooting

### MCP Server not connecting

1. Ensure Java 17+ is installed: `java -version`
2. Rebuild the JAR: `cd mcp-server && sbt clean assembly`
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
