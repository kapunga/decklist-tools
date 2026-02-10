---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Consolidate Scryfall module and add test coverage

Phase 1: Scryfall Module Consolidation
- Added `getCardPrintings()` function to shared package
- Added in-memory sets cache for `getAllSets()` (24-hour expiry)
- Exported `WUBRG_ORDER` constant
- Replaced electron-app's scryfall.ts with re-exports from shared (~300 lines removed)
- Added `set_name` optional field to `ScryfallCard` type

Phase 2: Test Coverage
- Added Vitest to shared package
- Created tests for scryfall utilities (sortColorsWUBRG, getCardImageUrl, getCardFaceImageUrl)
- Created tests for arena format parser
- Created tests for card-utils (consolidateDuplicateCards, findCardByName)
- 49 new tests added

Phase 3: Internal Deduplication
- Removed duplicate `migrateLegacyPulledCards` from storage (uses types export)
- ColorPips now imports `sortColorsWUBRG` from shared instead of defining locally
- Added `updateRoleInList` and `deleteRoleFromList` helpers to reduce role-tools duplication
