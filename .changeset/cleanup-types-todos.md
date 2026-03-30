---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Eliminate duplicate types, resolve remaining TODOs

- Replace electron-app's ~450-line `src/types/index.ts` with a 2-line re-export from shared
- Migrate `validateDeck` in MCP deck-tools to use domain `validateDeckStructure`
- Extract `updateCardInDeck` domain function for immutable card field updates
- Remove unused `consolidateDuplicateCards` (replaced by domain `mergeCardIntoList`)
