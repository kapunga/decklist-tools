---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

`search_cards` takes `names` (up to 100 exact card names) for a cache-first batch lookup through POST /cards/collection, listing misses explicitly; batch lookup failures now surface as Scryfall errors instead of looking like "not found".
