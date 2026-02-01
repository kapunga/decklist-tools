# Deck Management

Tools for creating, retrieving, and managing decks.

## `list_decks`

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

## `get_deck`

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

## `manage_deck`

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
