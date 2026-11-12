---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

`deck_list` renders every card through one formatter in every mode: `group_by: type|role` and `sort_by: set` now honour `detail`, show roles and `[NEED TO BUY]` / `[PULLED]` flags on each copy, and keep the Alternates and Sideboard sections. Commander lines show mana cost, type line and oracle text, and uncached commanders are fetched (or named in the missing-data warning).
