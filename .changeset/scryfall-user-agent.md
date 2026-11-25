---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Send the app User-Agent on every Scryfall request from the desktop app. Scryfall rejects default-library User-Agents, so card image and art-crop caching, "Pre-cache deck" and "Load all cards" had been failing silently.
