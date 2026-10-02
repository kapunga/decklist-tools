---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

MCP server now sends `instructions` on initialize, telling the model to load the bundled mtg-deckbuilder skills when available (and to proceed with the tools when not). Also reports its real package version and fixes the `get_deck` description that pointed at the removed `view_deck` tool.
