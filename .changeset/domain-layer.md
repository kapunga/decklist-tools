---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Shared domain layer: unified business logic, composable validators, optimistic locking

- Add `domain/` module with pure functions for card operations (add, remove, move, merge), commander management, and role CRUD
- All operations are immutable — return new Deck via `OpResult<M>` with operation metadata
- Add composable validators: deck size, sideboard size, card limits, commander presence, format legality, color identity
- Validation is informational (two categories: structure, legality) — never blocks operations
- Add `colorIdentity` field to `CardIdentifier` — every card carries its color identity from Scryfall
- One-time migration populates `colorIdentity` on existing cards from Scryfall cache
- Add optimistic locking to `saveDeck` with `ConcurrentModificationError`
- Migrate MCP tools and Electron stores to use domain functions
- Eliminate duplicated business logic between MCP server and Electron app
