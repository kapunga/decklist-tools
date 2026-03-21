---
"@mtg-deckbuilder/mcp-server": minor
---

Rename set_commanders to manage_commander with add, remove, and swap actions

The MCP tool for managing commanders has been expanded from a single "add" operation into a full action-based tool supporting add, remove, and swap. Color identity is now recomputed from all remaining commanders when removing or swapping, which is important for partner commander decks.
