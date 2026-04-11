---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Split the `view_deck` MCP tool into four per-view tools: `deck_list`, `deck_curve`, `deck_notes`, and `deck_pull_list`. Each tool takes only the parameters relevant to its view — no more string `view` multiplexing.

**Breaking change for MCP clients**: `view_deck` has been removed. Callers should migrate:

- `view_deck(deck_id, view: "full", ...)` → `deck_list(deck_id, ...)`
- `view_deck(deck_id, view: "curve", filters)` → `deck_curve(deck_id, filters)`
- `view_deck(deck_id, view: "notes")` → `deck_notes(deck_id)`
- `view_deck(deck_id, view: "pull-list")` → `deck_pull_list(deck_id)`

**Key behavior change**: `deck_list` defaults `detail` to `compact` (was effectively `summary` via the formatter fallback). The new default includes oracle text on every card — the content LLMs actually want for deck analysis. Pass `detail: "summary"` for the old terse one-line form, or `detail: "full"` to additionally include set and rarity.

`deck_notes` no longer loads the Scryfall cache (notes rendering doesn't need oracle text), saving N per-card cache lookups per call.
