---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

`manage_card_list` remove can now target an entry by `entry_id`, refuses ambiguous card names (listing the candidates) instead of removing the first match, and returns the removed entry
