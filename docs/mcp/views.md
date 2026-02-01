# Views

Tools for rendering deck views in different formats.

## `view_deck`

Render a deck using a specific view format. Available views are listed in the tool description dynamically.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `view` | string | no | `full` (default), `curve`, or `notes` |
| `detail` | string | no | Card detail level: `summary` (default), `compact`, or `full` |
| `sort_by` | string | no | `name` (default) or `set` (sort by set+collector number, shows `[x]`/`[ ]` ownership markers) |
| `group_by` | string | no | `none` (default), `role` (group by role), or `type` (group by card type) |
| `filters` | object[] | no | Array of filter objects |

Each filter object:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `cmc`, `color`, `card-type`, `role`, or `ownership` |
| `mode` | string | `include` or `exclude` |
| `values` | any[] | Values to match (ownership values: `unknown`, `owned`, `pulled`, `need_to_buy`) |

**Response:** Markdown-formatted string of the rendered deck view.

### Detail levels

The `detail` parameter controls how much card information is shown (requires Scryfall cache):

**`summary`** (default) — One line per card with mana cost and primary type:
```
- 1x Sol Ring • {1} [Artifact] (Ramp) [NEED TO BUY]
```

**`compact`** — Mana cost, full type line, P/T, and oracle text. Good for deck evaluation without extra lookups:
```
- 1x Sol Ring • {1} Artifact (Ramp)
  {T}: Add {C}{C}.
```

**`full`** — Everything: set, rarity, full type line, P/T, and oracle text:
```
- 1x Swords to Plowshares • STA#10 • mythic • {W} Instant (Removal) [PULLED]
  Exile target creature. Its controller gains life equal to its power.
```

When no cached Scryfall data is available, all levels fall back to card name only.
