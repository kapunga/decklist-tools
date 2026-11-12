# Card Management

Tools for managing cards within decks and searching for cards on Scryfall.

## `manage_card`

Add, remove, update, or move cards in a deck. Supports batch operations via the `cards` array.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add`, `remove`, `update`, or `move` |
| `deck_id` | string | yes | Deck UUID |
| `cards` | string[] | no* | Batch of cards (see format per action below) |
| `name` | string | no* | Single card name (deprecated, use `cards`) |
| `set_code` | string | no | Set code for single-card add (deprecated, use `cards`) |
| `collector_number` | string | no | Collector number for single-card add (deprecated, use `cards`) |
| `quantity` | number | no | Copies for single-card add (deprecated, use `Nx` prefix in `cards`) |
| `roles` | string[] | no | Role IDs (add: initial roles, update: replace all) |
| `ownership` | string | no | `unknown` (default), `owned`, or `need_to_buy` (add/update) |
| `to_alternates` | boolean | no | Add to alternates (add) |
| `to_sideboard` | boolean | no | Add to sideboard (add) |
| `from_alternates` | boolean | no | Remove from alternates (remove) |
| `from_sideboard` | boolean | no | Remove from sideboard (remove) |
| `add_roles` | string[] | no | Add roles to existing (update) |
| `remove_roles` | string[] | no | Remove roles (update) |
| `notes` | string | no | Card notes (update) |
| `from` | string | move | `mainboard`, `sideboard`, `alternates`, or `cut` |
| `to` | string | move | `mainboard`, `sideboard`, `alternates`, or `cut` |

\* Either `cards` or `name` must be provided. If `name` is provided without `cards`, it is treated as `cards: [name]`.

### Card string formats

**Add action** — each entry is `"[Nx ]<set_code> <collector_number>"`:
- `"fdn 542"` → 1 copy from set FDN, collector number 542
- `"2x woe 138"` → 2 copies from set WOE, collector number 138

**Remove / Update / Move actions** — each entry is a card name (e.g. `"Sol Ring"`).

### Examples

**Batch add:**
```json
{
  "action": "add",
  "deck_id": "abc-123",
  "cards": ["fdn 542", "2x woe 138", "woe 142"],
  "roles": ["combat-trick"]
}
```

**Batch remove:**
```json
{
  "action": "remove",
  "deck_id": "abc-123",
  "cards": ["Snakeskin Veil", "Giant Growth"],
  "from_alternates": true
}
```

**Batch update:**
```json
{
  "action": "update",
  "deck_id": "abc-123",
  "cards": ["Snakeskin Veil", "Giant Growth"],
  "add_roles": ["combat-trick"]
}
```

**Batch move:**
```json
{
  "action": "move",
  "deck_id": "abc-123",
  "cards": ["Snakeskin Veil"],
  "from": "alternates",
  "to": "mainboard"
}
```

### Responses

**Response (add):**
```json
{ "success": true, "cards": [{ "name": "Sol Ring", "set": "c21", "collectorNumber": "263", "quantity": 1 }] }
```

**Response (remove):**
```json
{ "success": true, "message": "Removed Sol Ring, Arcane Signet from deck" }
```

**Response (update):**
```json
{ "success": true, "cards": [{ "name": "Sol Ring", "roles": ["ramp", "fast-mana"] }] }
```

**Response (move):**
```json
{ "success": true, "message": "Moved Sol Ring from alternates to mainboard" }
```

## `search_cards`

Search for cards on Scryfall. Pass either `query` or `names`, not both.

`query` accepts a card name (fuzzy or exact), a Scryfall UUID, or a full Scryfall search query. The query type is auto-detected:

- **UUID** (e.g. `12345678-1234-...`) → fetch by Scryfall ID
- **Scryfall operators** (e.g. `t:instant c:red`) → full search
- **Plain text** → fuzzy name lookup (or exact if `exact: true`)

`names` looks up a list of exact card names in one call (see [Looking up many cards](#looking-up-many-cards)).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | one of `query` / `names` | Card name, Scryfall UUID, or search query. Max 500 characters |
| `names` | string[] | one of `query` / `names` | 1–100 exact card names (each max 200 characters) |
| `exact` | boolean | no | Use exact name matching instead of fuzzy (`query` only; `names` is always exact) |
| `limit` | number | no | Max results for search queries (default 10; `query` only) |
| `set_code` | string | no | Set code for specific printing (`query` only) |
| `collector_number` | string | no | Collector number for specific printing (`query` only) |
| `format` | string | no | `compact` (default) or `json` |

### Looking up many cards

Use `names` instead of chaining `!"…" or !"…"` clauses into one `query`, which soon runs into the 500-character limit. Names are matched exactly (case-insensitive), and a repeated name is looked up once. Names already in the local card cache cost no request; the rest are fetched in batches of 75, and everything fetched is cached, so asking again is instant. Cards come back in the order you asked for them, followed by the names Scryfall does not know:

```
Found 2 of 3 cards:

Sol Ring • C21#263 • uncommon • {1} Artifact
{T}: Add {C}{C}.

Lightning Bolt • LEA#161 • common • {R} Instant
Lightning Bolt deals 3 damage to any target.

Not found: Lightning Blot
```

With `format: "json"` the response is `{ "cards": [ ... ], "notFound": [ ... ] }`. If Scryfall itself fails (for example a lasting rate limit), the call returns that error rather than reporting the cards as not found.

### Compact format (default)

The default output is a token-efficient text format.

**Single card (normal):**
```
Sol Ring • C21#263 • uncommon • {1} Artifact
{T}: Add {C}{C}.
```

**Single card (creature with P/T):**
```
Adorable Kitten • UNH#1 • common • {W} Creature — Cat 1/1
When Adorable Kitten enters the battlefield, roll a six-sided die. You gain life equal to the result.
```

**Double-faced cards (transform/modal_dfc/adventure):**
```
Front Name // Back Name • SET#123 • rarity • transform
Front: {mana_cost} Type Line P/T
front oracle text
---
Back: Back Type Line P/T
back oracle text
```

**Search (multiple results):**
```
Found 142 cards:

Sol Ring • C21#263 • uncommon • {1} Artifact
{T}: Add {C}{C}.

Arcane Signet • C21#159 • common • {2} Artifact
{T}: Add one mana of any color in your commander's color identity.
```

### JSON format (`format: "json"`)

**Response (single card):**
```json
{
  "name": "Sol Ring",
  "scryfallId": "4cbc6901-...",
  "manaCost": "{1}",
  "cmc": 1,
  "typeLine": "Artifact",
  "oracleText": "{T}: Add {C}{C}.",
  "power": null,
  "toughness": null,
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
