# Search & Collection

Tools for searching across decks and working with your collection.

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

## `get_collection_filter`

Generate a Scryfall filter string based on your set collection. Includes sets at their configured collection levels with appropriate rarity filters.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | | | |

**Response:**
```json
{
  "filterString": "(s:neo r<=uncommon) or (s:mom r<=rare)",
  "sets": [{ "code": "neo", "level": 1 }, { "code": "mom", "level": 2 }],
  "totalSets": 2,
  "isEmpty": false
}
```

::: tip Finding cards to buy
To find cards you still need to buy, use [`deck_list`](/mcp/views#deck_list) with an ownership filter:
```json
{ "filters": [{ "type": "ownership", "mode": "include", "values": ["need_to_buy"] }] }
```
:::
