---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Add versioned schema migration system for deck data

- Add `schemaVersion` field to Deck type for tracking migration state
- Add `migrations/` module with ordered migration registry and `runMigrations()`
- Migrations run automatically on deck load (both MCP and Electron) and persist
- Migration 001: populate default fields on deck notes (replaces render-time migrateDeckNote)
- Remove ad-hoc migration functions (migrateLegacyPulledCards, migrateColorIdentity)
- New migrations are added by creating a file and registering it — no Storage changes needed
