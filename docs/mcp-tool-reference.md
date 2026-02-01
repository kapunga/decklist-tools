# MCP Tool Reference

Complete reference for all 15 MCP server tools. For usage guides and workflows, see [MCP Usage](./usage-mcp.md).

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

Get a deck by ID or name. Includes format validation results.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `identifier` | string | yes | Deck UUID or name (case-insensitive) |

**Response:** Complete `Deck` object with all fields, plus a `validation` field:
```json
{
  "...deck fields...",
  "validation": {
    "valid": false,
    "issues": ["Deck has 98 cards, needs 99"],
    "summary": {
      "cardCount": 98,
      "deckSize": 99,
      "sideboardCount": 0,
      "sideboardSize": 15,
      "commanders": ["Atraxa, Praetors' Voice"]
    }
  }
}
```

### `manage_deck`

Create, update, or delete a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `create`, `update`, or `delete` |
| `deck_id` | string | update/delete | Deck UUID |
| `name` | string | create | Deck name |
| `format` | string | create | `commander`, `standard`, `modern`, or `kitchen_table` |
| `archetype` | string | no | Deck archetype |
| `description` | string | no | Deck description |

**Response (create):**
```json
{ "id": "a1b2c3d4-...", "name": "Atraxa Superfriends", "format": "commander" }
```

**Response (update):**
```json
{ "success": true, "deck": { "id": "a1b2c3d4-...", "name": "Atraxa Superfriends" } }
```

**Response (delete):**
```json
{ "success": true, "message": "Deck a1b2c3d4-... deleted" }
```

## Card Management

### `manage_card`

Add, remove, update, or move a card in a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add`, `remove`, `update`, or `move` |
| `deck_id` | string | yes | Deck UUID |
| `name` | string | yes | Card name |
| `set_code` | string | no | Set code for specific printing (add) |
| `collector_number` | string | no | Collector number (add) |
| `quantity` | number | no | Number of copies (add: default 1, remove: default all) |
| `roles` | string[] | no | Role IDs (add: initial roles, update: replace all) |
| `status` | string | no | `confirmed` or `considering` (add/update) |
| `ownership` | string | no | `owned`, `pulled`, or `need_to_buy` (add/update) |
| `to_alternates` | boolean | no | Add to alternates (add) |
| `to_sideboard` | boolean | no | Add to sideboard (add) |
| `from_alternates` | boolean | no | Remove from alternates (remove) |
| `from_sideboard` | boolean | no | Remove from sideboard (remove) |
| `add_roles` | string[] | no | Add roles to existing (update) |
| `remove_roles` | string[] | no | Remove roles (update) |
| `pinned` | boolean | no | Pin/unpin card (update) |
| `notes` | string | no | Card notes (update) |
| `from` | string | move | `mainboard`, `alternates`, or `sideboard` |
| `to` | string | move | `mainboard`, `alternates`, or `sideboard` |

**Response (add):**
```json
{ "success": true, "card": { "name": "Sol Ring", "set": "c21", "collectorNumber": "263", "quantity": 1 } }
```

**Response (remove):**
```json
{ "success": true, "message": "Removed Sol Ring from deck" }
```

**Response (update):**
```json
{ "success": true, "card": { "name": "Sol Ring", "roles": ["ramp", "fast-mana"] } }
```

**Response (move):**
```json
{ "success": true, "message": "Moved Sol Ring from alternates to mainboard" }
```

## Card Search

### `search_cards`

Search for cards on Scryfall. Accepts a card name (fuzzy or exact), a Scryfall UUID, or a full Scryfall search query. The query type is auto-detected:

- **UUID** (e.g. `12345678-1234-...`) → fetch by Scryfall ID
- **Scryfall operators** (e.g. `t:instant c:red`) → full search
- **Plain text** → fuzzy name lookup (or exact if `exact: true`)

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Card name, Scryfall UUID, or search query |
| `exact` | boolean | no | Use exact name matching instead of fuzzy |
| `limit` | number | no | Max results for search queries (default 10) |
| `set_code` | string | no | Set code for specific printing |
| `collector_number` | string | no | Collector number for specific printing |

**Response (single card):**
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

**Response (search):**
```json
{
  "totalCards": 142,
  "hasMore": true,
  "cards": [ { "...card fields..." } ]
}
```

## Views

### `view_deck`

Render a deck using a specific view format. Available views are listed in the tool description dynamically.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `view` | string | no | `full` (default), `curve`, or `notes` |
| `sort_by` | string | no | `name` (default) or `set` (sort by set+collector number, shows `[x]`/`[ ]` ownership markers) |
| `group_by` | string | no | `none` (default), `role` (group by role), or `type` (group by card type) |
| `filters` | object[] | no | Array of filter objects |

Each filter object:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `cmc`, `color`, `card-type`, `role`, or `ownership` |
| `mode` | string | `include` or `exclude` |
| `values` | any[] | Values to match (ownership values: `owned`, `pulled`, `need_to_buy`) |

**Response:** Markdown-formatted string of the rendered deck view.

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

### `manage_role`

Add or manage roles.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add_custom`, `add_global`, `update_global`, or `delete_global` |
| `deck_id` | string | add_custom | Deck UUID |
| `id` | string | yes | Role ID (lowercase with hyphens) |
| `name` | string | add_custom/add_global | Display name |
| `description` | string | no | Role description |
| `color` | string | no | Hex color code (e.g. `#ef4444`) |

**Response:**
```json
{ "success": true, "role": { "id": "fast-mana", "name": "Fast Mana" } }
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

### `manage_interest_list`

Add or remove cards from the interest list.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add` or `remove` |
| `name` | string | add | Card name |
| `card_name` | string | remove | Card name to remove |
| `set_code` | string | no | Set code |
| `collector_number` | string | no | Collector number |
| `notes` | string | no | Notes about the card |
| `potential_decks` | string[] | no | Deck names this card might fit |
| `source` | string | no | Where you heard about the card |

**Response (add):**
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

**Response (remove):**
```json
{ "success": true, "message": "Removed Smothering Tithe from interest list" }
```

## Notes

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
    "cardRefs": [{ "cardName": "Eternal Witness", "ordinal": 1 }],
    "content": "Flicker Eternal Witness to loop spells.",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

### `manage_deck_note`

Add, update, or delete a deck note.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add`, `update`, or `delete` |
| `deck_id` | string | yes | Deck UUID |
| `note_id` | string | update/delete | Note UUID |
| `title` | string | add | Note title |
| `content` | string | add | Markdown content |
| `note_type` | string | add | `combo`, `synergy`, `theme`, `strategy`, or `general` |
| `card_names` | string[] | no | Associated card names, ordered by relevance |
| `role_id` | string | no | Role to propagate to associated cards |
| `remove_role` | boolean | no | Remove role from associated cards (update/delete) |

**Response (add/update):**
```json
{ "success": true, "note": { "id": "n1o2p3q4-...", "title": "Blink Combo", "noteType": "combo", "..." } }
```

**Response (delete):**
```json
{ "success": true, "message": "Note \"Blink Combo\" deleted" }
```

## Search & Reports

### `search_decks_for_card`

Find which decks contain a specific card.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `card_name` | string | yes | Card name to search for |

**Response:**
```json
[
  { "deckId": "a1b2c3d4-...", "deckName": "Atraxa Superfriends", "location": "mainboard", "quantity": 1 }
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
