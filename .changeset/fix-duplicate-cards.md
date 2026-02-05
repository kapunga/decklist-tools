---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix duplicate card entries in deck lists

- MCP server's add and move actions now check for existing cards and merge instead of creating duplicates
- Electron app's moveCard action now handles duplicates consistently
- Added shared utilities: `findCardByName`, `findCardIndexByName`, and `consolidateDuplicateCards`
