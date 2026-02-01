# Views

Tools for rendering deck views in different formats.

## `view_deck`

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

Card lines in the `full` view include mana cost when Scryfall data is cached:
```
- 1x Sol Ring • {1} [Artifact] (Ramp) [NEED TO BUY]
```
When no cached data is available, the mana cost is omitted.
