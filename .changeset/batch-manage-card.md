---
"@mtg-deckbuilder/mcp-server": minor
---

Rework `manage_card` tool to support batch operations via a new `cards` array parameter. All actions (add, remove, update, move) now accept multiple cards in a single call. The existing `name` parameter is preserved for backward compatibility.

For the add action, cards use a `"[Nx ]<set_code> <collector_number>"` format (e.g. `"2x woe 138"`). For remove, update, and move actions, cards are specified by name.
