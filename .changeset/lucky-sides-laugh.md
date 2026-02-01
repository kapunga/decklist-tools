---
"@mtg-deckbuilder/electron-app": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/shared": patch
---

Initial release of MTG Deckbuilder Tools.

- **Shared package**: Common types, Scryfall API client with rate limiting, and import/export parsers for Arena, Moxfield, Archidekt, MTGO, and simple text formats
- **MCP Server**: 30+ tools for deck management, card operations, views, roles, notes, validation, and search — usable through Claude Desktop
- **Electron App**: Desktop deck manager with card grid, mana curve visualization, role-based grouping, and one-click Claude Desktop integration
- **Shared storage**: All packages read/write the same JSON files with optimistic locking
