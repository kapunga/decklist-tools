# Interest List

Tools for tracking cards you're interested in across decks.

## `get_interest_list`

Get the full interest list.

**Input:** None

**Response:** Complete `InterestList` object containing all tracked cards of interest.

## `manage_interest_list`

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
