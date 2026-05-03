---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Extract `createCardIdentifier` to shared and replace inline reconstructions

`createCardIdentifier(scryfallCard, overrides?)` is now exported from
`@mtg-deckbuilder/shared` as the single source of truth for converting a
`ScryfallCard` to a `CardIdentifier`. The MCP server's previous local helper
has been removed in favor of the shared export.

Five inline `CardIdentifier` constructions in the Electron renderer
(`QuickAdd`, `DeckDetail`, `InterestListView`, `CardEditModal`,
`useImportCards`) were silently dropping `flavorName` and `colorIdentity`.
They now go through the shared helper and carry every field, fixing a class
of bug where flavor-named printings (Universes Beyond, Secret Lair) lost
their flavor name on add and where commander color-identity computation
could union to empty when CardIdentifiers were persisted without their
`colorIdentity`. `useImportCards` uses the helper's optional `overrides`
parameter to preserve imported set/collector-number intent.
