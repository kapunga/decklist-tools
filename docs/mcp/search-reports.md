# Search & Reports

Tools for searching across decks and generating reports.

## `search_decks_for_card`

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
