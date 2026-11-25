---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Editing one card in a deck no longer makes every card in it look changed to the UI: the app keeps the deck it built across a save and takes only the new version and timestamp from disk.
