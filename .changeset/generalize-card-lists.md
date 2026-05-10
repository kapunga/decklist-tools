---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Generalize the Interest List into a Lists section. Each `CardList` now carries
an optional `kind` (`interest` | `collection` | `scan` | `wishlist` | `custom`)
that drives default descriptions and UI affordances. The Electron app gains a
new Lists index, per-list create/rename/delete, per-list decklist import, and a
format-legality panel showing union/intersection legality across the list's
cards. The MCP `get_interest_list`/`manage_interest_list` tools are replaced by
generic `list_card_lists`, `get_card_list`, and `manage_card_list` tools.

Also adds a new **Mythic Tools (CSV)** import format scoped to list imports —
parses the Mythic Tools collection-export CSV using only the card-identifying
fields (name, set code, collector number, quantity); price/condition/container
data is ignored. The Electron app's stale duplicate of the formats module was
deleted in favor of the shared package's implementation.
