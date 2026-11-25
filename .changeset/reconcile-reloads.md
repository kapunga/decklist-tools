---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Stop the desktop app re-rendering everything after every save. Reloads from disk are now merged into the store, so decks, lists and settings that did not change keep their identity and a reload triggered by the app's own write does nothing.
