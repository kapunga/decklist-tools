---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

`search_cards` now surfaces Scryfall's own error details and warnings instead of reporting broken queries as "Found 0 cards", and detects search syntax structurally so malformed queries like `(t:instant` no longer fail with "Card not found". `deck_list` / `deck_curve` filter values are now case-insensitive, document their legal values, and reject unrecognised values with an error instead of returning an empty list.
