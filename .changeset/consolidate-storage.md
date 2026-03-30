---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": minor
---

Consolidate Storage: Electron app now uses shared Storage class

- Delete duplicated `electron/storage.ts` (~1100 lines)
- Electron app imports `Storage` from `@mtg-deckbuilder/shared` directly
- Extract Electron-specific functions (file watching, export/import, pre-caching) to `electron/storage-extensions.ts`
- Electron app gains: optimistic locking, UUID validation, getCacheStats optimization, proper types, unified migration path
- Fix `migrateColorIdentity` null guards for decks with missing fields
