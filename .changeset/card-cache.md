---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Look cards up through one cache (memory, then disk, then a single batched Scryfall request) instead of fetching each card from Scryfall individually. Opening the deck list no longer sends a request per mainboard card, cards added with quick add are cached to disk, and deck entries with no cached data are back-filled the first time they are viewed.
