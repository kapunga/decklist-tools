# MTG Deckbuilder MCP Server Specification

## Overview

Build an MCP server for managing Magic: The Gathering decks. The server enables Claude to help users build, analyze, and manage their decks through natural conversation.

## Technology Stack

- **Language:** Scala 3
- **Effect System:** cats-effect 3.x
- **MCP Library:** `ch.linkyard:scala-mcp` (linkyard/scala-effect-mcp on GitHub)
- **HTTP Client:** http4s-ember-client (for Scryfall API)
- **JSON:** Circe
- **File I/O:** fs2-io

## Storage

Use the JSON file format defined in `01-storage-format.md`. Load decks into memory on startup; persist changes immediately to disk.

---

## MCP Tools

### Deck Management

#### `list_decks`
List all saved decks with summary info.

**Input:** None

**Output:** List of decks with id, name, format, card count, last modified date.

---

#### `get_deck`
Get a deck by ID or name.

**Input:**
- `identifier` (string): Deck UUID or name (case-insensitive match)

**Output:** Full deck JSON or error if not found.

---

#### `create_deck`
Create a new empty deck.

**Input:**
- `name` (string, required)
- `format` (string, required): "commander" | "standard" | "modern" | "kitchen_table"
- `archetype` (string, optional): e.g., "Tokens", "Control"
- `description` (string, optional): Markdown description

**Output:** Confirmation with new deck ID.

---

#### `update_deck_metadata`
Update deck name, description, archetype, or strategy.

**Input:**
- `deck_id` (string, required)
- `name` (string, optional)
- `description` (string, optional)
- `archetype` (string, optional)
- `strategy` (object, optional): Full DeckStrategy object

**Output:** Confirmation.

---

#### `delete_deck`
Delete a deck permanently.

**Input:**
- `deck_id` (string, required)

**Output:** Confirmation.

---

### Card Management

#### `add_card`
Add a card to a deck. Resolves card via Scryfall.

**Input:**
- `deck_id` (string, required)
- `name` (string, required): Card name
- `set_code` (string, optional): Set code for specific printing
- `collector_number` (string, optional): Collector number for specific printing
- `quantity` (number, optional, default 1)
- `role` (string, optional): "commander" | "core" | "enabler" | "support" | "flex" | "land"
- `tags` (string[], optional): Tag IDs to apply
- `status` (string, optional, default "confirmed"): "confirmed" | "considering"
- `ownership` (string, optional, default "owned"): "owned" | "pulled" | "need_to_buy"
- `to_alternates` (boolean, optional): Add to alternates list instead of mainboard
- `to_sideboard` (boolean, optional): Add to sideboard instead of mainboard

**Behavior:**
1. If set_code + collector_number provided, lookup that exact printing
2. Otherwise, fuzzy search by name via Scryfall
3. Cache the Scryfall data
4. Validate against format rules (singleton, 4-of limit, etc.)
5. Warn but allow if validation fails (user may be building)

**Output:** Confirmation with resolved card details, or error if card not found.

---

#### `remove_card`
Remove a card from a deck.

**Input:**
- `deck_id` (string, required)
- `name` (string, required): Card name to remove
- `quantity` (number, optional): Remove this many copies (default: all)
- `from_alternates` (boolean, optional)
- `from_sideboard` (boolean, optional)

**Output:** Confirmation.

---

#### `update_card`
Update a card's metadata in a deck.

**Input:**
- `deck_id` (string, required)
- `name` (string, required): Card name to update
- `role` (string, optional)
- `tags` (string[], optional): Replace all tags
- `add_tags` (string[], optional): Add these tags
- `remove_tags` (string[], optional): Remove these tags
- `status` (string, optional): "confirmed" | "considering" | "cut"
- `ownership` (string, optional): "owned" | "pulled" | "need_to_buy"
- `pinned` (boolean, optional)
- `notes` (string, optional)

**Output:** Confirmation.

---

#### `move_card`
Move a card between mainboard, alternates, and sideboard.

**Input:**
- `deck_id` (string, required)
- `name` (string, required)
- `from` (string, required): "mainboard" | "alternates" | "sideboard"
- `to` (string, required): "mainboard" | "alternates" | "sideboard"

**Output:** Confirmation.

---

#### `lookup_card`
Look up a card from Scryfall without adding to a deck.

**Input:**
- `name` (string, required)
- `set_code` (string, optional)
- `collector_number` (string, optional)

**Output:** Card details including name, mana cost, type, text, colors, legalities.

---

### Views

#### `view_deck`
Render a deck using a specific view format.

**Input:**
- `deck_id` (string, required)
- `view` (string, optional, default "full"): View ID
- `sort_by` (string, optional): "name" | "set" | "cmc" | "type" | "role"
- `group_by` (string, optional): "role" | "type" | "tag" | "status"

**Output:** Rendered view as text/markdown.

---

#### `list_views`
List available deck views.

**Input:** None

**Output:** List of view IDs with names and descriptions.

---

### Built-in Views to Implement

| ID | Name | Description |
|----|------|-------------|
| `full` | Full Deck | Complete deck with all metadata, stats, and mana curve. Good for LLM discussion. |
| `skeleton` | Skeleton | Minimal: just card names grouped by role. Lowest token count. |
| `checklist` | Pull Checklist | Sorted by set/collector number with checkboxes. For pulling cards from collection. |
| `curve` | Mana Curve | Mana curve visualization and type distribution stats. |
| `buy-list` | Buy List | Only cards with ownership="need_to_buy" across all lists. |
| `by-role` | By Role | Grouped by card role with counts. |
| `by-function` | By Function | Grouped by function tags (removal, ramp, draw, etc.). |

**Extensibility:** Views should be defined in a way that makes adding new ones trivial - ideally a trait/interface with a render method that takes a Deck and returns a string.

---

### Tags

#### `list_tags`
List all available tags (global + deck-specific if deck_id provided).

**Input:**
- `deck_id` (string, optional): Include deck's custom tags

**Output:** List of tags with id, name, category, description.

---

#### `add_custom_tag`
Add a custom tag to a deck's tag definitions.

**Input:**
- `deck_id` (string, required)
- `id` (string, required): Tag ID (lowercase, no spaces)
- `name` (string, required): Display name
- `description` (string, optional)
- `color` (string, optional): Hex color

**Output:** Confirmation.

---

#### `add_global_tag`
Add a new global tag to the taxonomy.

**Input:**
- `id` (string, required)
- `name` (string, required)
- `category` (string, required): "function" | "strategy" | "theme" | "mechanic" | "meta"
- `description` (string, required)

**Output:** Confirmation.

---

### Interest List

#### `get_interest_list`
Get the full interest list.

**Input:** None

**Output:** List of interesting cards with notes and potential decks.

---

#### `add_to_interest_list`
Add a card to the interest list.

**Input:**
- `name` (string, required)
- `set_code` (string, optional)
- `collector_number` (string, optional)
- `notes` (string, optional)
- `potential_decks` (string[], optional): Deck IDs
- `source` (string, optional): Where you found it

**Output:** Confirmation.

---

#### `remove_from_interest_list`
Remove a card from the interest list.

**Input:**
- `card_name` (string, required)

**Output:** Confirmation.

---

### Import/Export

#### `import_deck`
Import a decklist from text.

**Input:**
- `deck_id` (string, optional): Import into existing deck (merge)
- `name` (string, optional): Name for new deck (if not importing into existing)
- `format` (string, optional): Deck format for new deck
- `text` (string, required): Decklist text
- `source_format` (string, optional): "arena" | "moxfield" | "archidekt" | "mtgo" | "simple" | "auto"

**Behavior:**
1. If source_format is "auto" or not provided, detect format from content
2. Parse the decklist
3. Resolve each card via Scryfall
4. Map maybeboard entries to status="considering"
5. Create new deck or merge into existing
6. Report any cards that couldn't be resolved

**Output:** Summary of imported cards, any errors.

---

#### `export_deck`
Export a deck to a specific format.

**Input:**
- `deck_id` (string, required)
- `format` (string, required): "arena" | "moxfield" | "archidekt" | "mtgo" | "simple"
- `include_maybeboard` (boolean, optional, default false)
- `include_sideboard` (boolean, optional, default true)

**Output:** Formatted decklist text.

---

#### `list_export_formats`
List available import/export formats.

**Input:** None

**Output:** List of format IDs with descriptions.

---

### Validation

#### `validate_deck`
Check a deck against format rules.

**Input:**
- `deck_id` (string, required)

**Output:** Validation result with errors (rule violations) and warnings (suggestions).

---

### Search

#### `search_decks_for_card`
Find which decks contain a specific card.

**Input:**
- `card_name` (string, required)

**Output:** List of decks containing the card with quantity and role.

---

#### `get_buy_list`
Get all cards marked "need_to_buy" across all decks.

**Input:** None

**Output:** Aggregated buy list with card names, sets, quantities, and which decks need them.

---

## Scryfall Integration

### Minimal Integration
The MCP server needs basic Scryfall lookups:

1. **By set + collector number:** `GET /cards/{set}/{number}`
2. **By name (fuzzy):** `GET /cards/named?fuzzy={name}`
3. **By Scryfall ID:** `GET /cards/{id}`

### Caching
- Cache Scryfall responses to `cache/scryfall/{scryfall-id}.json`
- Default cache expiry: 7 days
- Include card data needed for views: name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, image_uris

### Rate Limiting
- Respect Scryfall's rate limits (be polite)
- Include proper User-Agent header: `MTGDeckbuilderMCP/1.0`

---

## Architecture Notes

### In-Memory State
- Load all decks into memory on startup
- Persist changes immediately to disk
- Use Ref[IO, Map[UUID, Deck]] for thread-safe state

### Error Handling
- Return helpful error messages, not stack traces
- Distinguish between "not found" and "invalid input" errors

### Extensibility Points
1. **Views:** Trait with `render(deck: Deck): String` method
2. **Import/Export Formats:** Trait with `parse(text: String)` and `render(deck: Deck)` methods
3. **Validation Rules:** Trait with `validate(deck: Deck): ValidationResult` method

---

## Example MCP Tool Registration

```scala
// Pseudocode for tool registration pattern
val tools = List(
  Tool("list_decks", "List all saved decks", Schema.empty)(listDecksHandler),
  Tool("get_deck", "Get a deck by ID or name", getDeckSchema)(getDeckHandler),
  Tool("add_card", "Add a card to a deck", addCardSchema)(addCardHandler),
  // ... etc
)

server.registerTools(tools)
```

The MCP server should expose all tools via the standard MCP protocol, communicating over stdio.
