# MCP Tool Reference

Complete reference for all 33 MCP server tools. For usage guides and workflows, see [MCP Usage](./usage-mcp.md).

## Deck Management

### `list_decks`

List all saved decks with summary info.

**Input:** None

**Response:**
```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Atraxa Superfriends",
    "format": "commander",
    "cardCount": 99,
    "commanders": ["Atraxa, Praetors' Voice"],
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

### `get_deck`

Get a deck by ID or name.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `identifier` | string | yes | Deck UUID or name (case-insensitive) |

**Response:** Complete `Deck` object with all fields (cards, metadata, notes, roles, etc.)

### `create_deck`

Create a new empty deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Deck name |
| `format` | string | yes | `commander`, `standard`, `modern`, or `kitchen_table` |
| `archetype` | string | no | Deck archetype |
| `description` | string | no | Deck description |

**Response:**
```json
{
  "id": "a1b2c3d4-...",
  "name": "Atraxa Superfriends",
  "format": "commander"
}
```

### `update_deck_metadata`

Update deck name, description, or archetype.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `name` | string | no | New name |
| `description` | string | no | New description |
| `archetype` | string | no | New archetype |

**Response:**
```json
{
  "success": true,
  "deck": {
    "id": "a1b2c3d4-...",
    "name": "Atraxa Superfriends"
  }
}
```

### `delete_deck`

Delete a deck permanently.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |

**Response:**
```json
{
  "success": true,
  "message": "Deck a1b2c3d4-... deleted"
}
```

## Card Management

### `add_card`

Add a card to a deck. Resolves card via Scryfall.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `name` | string | yes | Card name |
| `set_code` | string | no | Set code for specific printing |
| `collector_number` | string | no | Collector number for specific printing |
| `quantity` | number | no | Number of copies (default: 1) |
| `roles` | string[] | no | Role IDs to assign |
| `status` | string | no | `confirmed` or `considering` |
| `ownership` | string | no | `owned`, `pulled`, or `need_to_buy` |
| `to_alternates` | boolean | no | Add to alternates instead of mainboard |
| `to_sideboard` | boolean | no | Add to sideboard instead of mainboard |

**Response:**
```json
{
  "success": true,
  "card": {
    "name": "Sol Ring",
    "set": "c21",
    "collectorNumber": "263",
    "quantity": 1
  }
}
```

### `remove_card`

Remove a card from a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `name` | string | yes | Card name |
| `quantity` | number | no | Number to remove (default: all) |
| `from_alternates` | boolean | no | Remove from alternates |
| `from_sideboard` | boolean | no | Remove from sideboard |

**Response:**
```json
{
  "success": true,
  "message": "Removed Sol Ring from deck"
}
```

### `update_card`

Update a card's metadata in a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `name` | string | yes | Card name |
| `roles` | string[] | no | Replace all roles with this list |
| `add_roles` | string[] | no | Add these roles to existing |
| `remove_roles` | string[] | no | Remove these roles |
| `status` | string | no | `confirmed` or `considering` |
| `ownership` | string | no | `owned`, `pulled`, or `need_to_buy` |
| `pinned` | boolean | no | Pin/unpin the card |
| `notes` | string | no | Card notes |

**Response:**
```json
{
  "success": true,
  "card": {
    "name": "Sol Ring",
    "roles": ["ramp", "fast-mana"]
  }
}
```

### `move_card`

Move a card between mainboard, alternates, and sideboard.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `name` | string | yes | Card name |
| `from` | string | yes | `mainboard`, `alternates`, or `sideboard` |
| `to` | string | yes | `mainboard`, `alternates`, or `sideboard` |

**Response:**
```json
{
  "success": true,
  "message": "Moved Sol Ring from alternates to mainboard"
}
```

## Card Lookup & Search

### `lookup_card`

Look up a card from Scryfall without adding to a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Card name |
| `set_code` | string | no | Set code |
| `collector_number` | string | no | Collector number |
| `exact` | boolean | no | Use exact name matching instead of fuzzy |

**Response:**
```json
{
  "name": "Sol Ring",
  "scryfallId": "4cbc6901-...",
  "manaCost": "{1}",
  "cmc": 1,
  "typeLine": "Artifact",
  "oracleText": "{T}: Add {C}{C}.",
  "colors": [],
  "colorIdentity": [],
  "set": "c21",
  "collectorNumber": "263",
  "rarity": "uncommon",
  "prices": { "usd": "1.50", "usd_foil": "3.00" },
  "legalities": { "commander": "legal", "standard": "not_legal" }
}
```

### `scryfall_search`

Search Scryfall using full query syntax (e.g. `c:blue t:instant cmc<=2`).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Scryfall search query |
| `limit` | number | no | Max results (default: 10) |

**Response:**
```json
{
  "totalCards": 142,
  "hasMore": true,
  "cards": [
    {
      "name": "Counterspell",
      "scryfallId": "...",
      "manaCost": "{U}{U}",
      "cmc": 2,
      "typeLine": "Instant",
      "oracleText": "Counter target spell.",
      "colors": ["U"],
      "colorIdentity": ["U"],
      "set": "cmr",
      "collectorNumber": "395",
      "rarity": "uncommon",
      "prices": {},
      "legalities": {}
    }
  ]
}
```

### `lookup_card_by_id`

Look up a card by its Scryfall UUID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `scryfall_id` | string | yes | Scryfall card UUID |

**Response:** Same shape as `lookup_card`.

## Views

### `view_deck`

Render a deck using a specific view format. Optionally filter cards.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `view` | string | no | View name (default: `full`) |
| `sort_by` | string | no | Sort field |
| `group_by` | string | no | Group field |
| `filters` | object[] | no | Array of filter objects (see below) |

Each filter object:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `cmc`, `color`, `card-type`, or `role` |
| `mode` | string | `include` or `exclude` |
| `values` | any[] | Values to match |

**Response:** Markdown-formatted string of the rendered deck view.

### `list_views`

List available deck views.

**Input:** None

**Response:**
```json
[
  { "id": "full", "name": "Full", "description": "Complete deck with all metadata" },
  { "id": "skeleton", "name": "Skeleton", "description": "Minimal view grouped by role" },
  { "id": "checklist", "name": "Checklist", "description": "Sorted for pulling cards" },
  { "id": "curve", "name": "Curve", "description": "Mana curve analysis" },
  { "id": "buy-list", "name": "Buy List", "description": "Only cards marked need_to_buy" },
  { "id": "by-role", "name": "By Role", "description": "Grouped by role" },
  { "id": "by-type", "name": "By Type", "description": "Grouped by card type" },
  { "id": "notes", "name": "Notes", "description": "Deck notes documenting combos, synergies, and strategy" }
]
```

## Roles

### `list_roles`

List all available roles (global + deck-specific if deck_id provided).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | no | Include deck-specific custom roles |

**Response:**
```json
{
  "global": [
    { "id": "ramp", "name": "Ramp", "description": "Mana acceleration", "color": "#22c55e" }
  ],
  "custom": [
    { "id": "blink-target", "name": "Blink Target", "description": "ETB value creatures" }
  ]
}
```

### `add_custom_role`

Add a custom role to a deck's role definitions.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `id` | string | yes | Role ID |
| `name` | string | yes | Display name |
| `description` | string | no | Role description |
| `color` | string | no | Hex color code |

**Response:**
```json
{
  "success": true,
  "role": { "id": "blink-target", "name": "Blink Target", "description": "ETB value creatures" }
}
```

### `add_global_role`

Add a new global role.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique role ID (lowercase with hyphens) |
| `name` | string | yes | Display name |
| `description` | string | no | Role description |
| `color` | string | no | Hex color code (e.g. `#ef4444`) |

**Response:**
```json
{
  "success": true,
  "role": { "id": "fast-mana", "name": "Fast Mana", "description": "Turn 1-2 acceleration", "color": "#ef4444" }
}
```

### `update_global_role`

Update an existing global role.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Role ID to update |
| `name` | string | no | New display name |
| `description` | string | no | New description |
| `color` | string | no | New hex color code |

**Response:**
```json
{
  "success": true,
  "role": { "id": "fast-mana", "name": "Fast Mana", "description": "Updated description", "color": "#ef4444" }
}
```

### `delete_global_role`

Delete a global role.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Role ID to delete |

**Response:**
```json
{
  "success": true,
  "message": "Role fast-mana deleted"
}
```

## Commanders

### `set_commanders`

Set the commanders for a Commander format deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `commander_name` | string | yes | Commander card name |
| `set_code` | string | no | Set code |
| `collector_number` | string | no | Collector number |

**Response:**
```json
{
  "success": true,
  "commanders": ["Atraxa, Praetors' Voice"],
  "colorIdentity": ["W", "U", "B", "G"]
}
```

## Interest List

### `get_interest_list`

Get the full interest list.

**Input:** None

**Response:** Complete `InterestList` object containing all tracked cards of interest.

### `add_to_interest_list`

Add a card to the interest list.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Card name |
| `set_code` | string | no | Set code |
| `collector_number` | string | no | Collector number |
| `notes` | string | no | Notes about the card |
| `potential_decks` | string[] | no | Deck names this card might fit |
| `source` | string | no | Where you heard about the card |

**Response:**
```json
{
  "success": true,
  "item": {
    "id": "e5f6g7h8-...",
    "card": { "name": "Smothering Tithe", "scryfallId": "..." },
    "notes": "Great in any white deck",
    "potentialDecks": ["Atraxa Superfriends"],
    "addedAt": "2025-01-15T10:30:00Z",
    "source": "EDHREC"
  }
}
```

### `remove_from_interest_list`

Remove a card from the interest list.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `card_name` | string | yes | Card name to remove |

**Response:**
```json
{
  "success": true,
  "message": "Removed Smothering Tithe from interest list"
}
```

## Import / Export

### `import_deck`

Import a decklist from text.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | yes | Decklist text |
| `deck_id` | string | no | Import into existing deck |
| `name` | string | no | Deck name (for new deck) |
| `format` | string | no | Deck format (for new deck) |
| `source_format` | string | no | `arena`, `moxfield`, `archidekt`, `mtgo`, `simple`, or `auto` |

**Response:**
```json
{
  "success": true,
  "deckId": "a1b2c3d4-...",
  "deckName": "Imported Deck",
  "cardsAdded": 98,
  "cardsFailed": 2,
  "details": {
    "added": ["Sol Ring", "Command Tower", "..."],
    "failed": [
      { "name": "Nonexistent Card", "error": "Card not found on Scryfall" }
    ]
  }
}
```

### `export_deck`

Export a deck to a specific format.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `format` | string | yes | `arena`, `moxfield`, `archidekt`, `mtgo`, or `simple` |
| `include_maybeboard` | boolean | no | Include alternates (default: false) |
| `include_sideboard` | boolean | no | Include sideboard (default: true) |

**Response:**
```json
{
  "format": "arena",
  "text": "1 Sol Ring\n1 Command Tower\n..."
}
```

### `list_export_formats`

List available import/export formats.

**Input:** None

**Response:**
```json
[
  { "id": "arena", "name": "MTG Arena", "description": "..." },
  { "id": "moxfield", "name": "Moxfield", "description": "..." },
  { "id": "archidekt", "name": "Archidekt", "description": "..." },
  { "id": "mtgo", "name": "MTGO", "description": "..." },
  { "id": "simple", "name": "Simple", "description": "..." }
]
```

## Notes

### `add_deck_note`

Add a note to a deck documenting combos, synergies, or strategy.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `title` | string | yes | Note title |
| `content` | string | yes | Markdown content |
| `note_type` | string | yes | `combo`, `synergy`, `theme`, `strategy`, or `general` |
| `card_names` | string[] | no | Associated card names, ordered by relevance |
| `role_id` | string | no | Role to propagate to associated cards |

**Response:**
```json
{
  "success": true,
  "note": {
    "id": "n1o2p3q4-...",
    "title": "Blink Combo",
    "noteType": "combo",
    "content": "Flicker Eternal Witness to loop spells.",
    "cardRefs": [
      { "cardName": "Eternal Witness", "order": 0 },
      { "cardName": "Thassa, Deep-Dwelling", "order": 1 }
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

### `update_deck_note`

Update an existing deck note.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `note_id` | string | yes | Note UUID |
| `title` | string | no | New title |
| `content` | string | no | New content |
| `note_type` | string | no | New type |
| `card_names` | string[] | no | Replace card refs with this ordered list |
| `role_id` | string | no | New role |
| `remove_role` | boolean | no | Remove role from associated cards |

**Response:**
```json
{
  "success": true,
  "note": { "...": "Updated DeckNote object" }
}
```

### `delete_deck_note`

Delete a deck note.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `note_id` | string | yes | Note UUID |
| `remove_role` | boolean | no | Remove note role from associated cards (default: false) |

**Response:**
```json
{
  "success": true,
  "message": "Note \"Blink Combo\" deleted"
}
```

### `list_deck_notes`

List all notes for a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |

**Response:**
```json
[
  {
    "id": "n1o2p3q4-...",
    "title": "Blink Combo",
    "noteType": "combo",
    "cardRefs": [
      { "cardName": "Eternal Witness", "order": 0 }
    ],
    "content": "Flicker Eternal Witness to loop spells.",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

## Validation & Search

### `validate_deck`

Check a deck against format rules.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |

**Response:**
```json
{
  "valid": false,
  "issues": ["Deck has 98 cards, needs 99 (+ 1 commander = 100)"],
  "summary": {
    "cardCount": 98,
    "deckSize": 99,
    "sideboardCount": 0,
    "sideboardSize": 15,
    "commanders": ["Atraxa, Praetors' Voice"]
  }
}
```

### `search_decks_for_card`

Find which decks contain a specific card.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `card_name` | string | yes | Card name to search for |

**Response:**
```json
[
  {
    "deckId": "a1b2c3d4-...",
    "deckName": "Atraxa Superfriends",
    "location": "mainboard",
    "quantity": 1
  }
]
```

### `get_buy_list`

Get all cards marked `need_to_buy` across all decks.

**Input:** None

**Response:**
```json
[
  {
    "cardName": "Smothering Tithe",
    "setCode": "rna",
    "collectorNumber": "22",
    "quantity": 1,
    "decks": ["Atraxa Superfriends"]
  }
]
```
