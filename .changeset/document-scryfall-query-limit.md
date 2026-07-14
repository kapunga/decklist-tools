---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Document Scryfall's 500-character query limit in the `scryfall-search` skill (cause and mitigation), with a pointer from `mtg-deckbuilder-lookup` near `get_collection_filter`, the most common source of long `OR`-chains that hit it.
