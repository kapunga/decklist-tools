---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

`get_deck` validation now also checks color identity and format legality (matching the desktop app), returns `issueDetails` with category and code, and lists uncached cards under `notChecked`
