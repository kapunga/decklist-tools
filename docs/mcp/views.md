# Views

Tools for rendering deck views in different formats. Each view is a separate tool.

## `deck_list`

Primary deck-analysis view. Returns the full card list as markdown with Oracle text. Supports grouping, sorting, and filtering.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `detail` | string | no | `summary`, `compact` (default), or `full` |
| `sort_by` | string | no | `name` or `set` |
| `group_by` | string | no | `none` (default), `role`, or `type` |
| `filters` | object[] | no | Array of filter objects |

Each filter object:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `cmc`, `color`, `card-type`, `role`, or `ownership` |
| `mode` | string | `include` or `exclude` |
| `values` | any[] | Values to match (ownership values: `unknown`, `owned`, `need_to_buy`) |

**Response:** Markdown-formatted string of the rendered deck view.

### Detail levels

The `detail` parameter controls how much card information is shown (requires Scryfall cache):

**`summary`** — One line per card with mana cost and primary type:
```
- 1x Sol Ring • {1} [Artifact] (Ramp) [NEED TO BUY]
```

**`compact`** (default) — Mana cost, full type line, P/T, and oracle text:
```
- 1x Sol Ring • {1} Artifact (Ramp)
  {T}: Add {C}{C}.
```

**`full`** — Everything: set, rarity, full type line, P/T, and oracle text:
```
- 1x Swords to Plowshares • STA#10 • mythic • {W} Instant (Removal) [NEED TO BUY]
  Exile target creature. Its controller gains life equal to its power.
```

When no cached Scryfall data is available, all levels fall back to card name only.

## `deck_curve`

Mana curve analysis for a deck: CMC distribution, color pip counts, and type breakdown.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `filters` | object[] | no | Card filters (same schema as `deck_list`) |

**Response:** Markdown string with mana curve analysis.

## `deck_notes`

Deck strategy notes: combos, synergies, themes, and game-plan commentary.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |

**Response:** Markdown string with strategy notes and card references.

## `deck_pull_list`

Cards grouped by set for physical collection pulling, with pulled-status tracking.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |

**Response:** Markdown string with cards organized by set.
