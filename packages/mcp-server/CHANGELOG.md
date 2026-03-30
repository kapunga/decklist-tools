# @mtg-deckbuilder/mcp-server

## 0.7.0

### Minor Changes

- e1e2a00: Add Claude Code and Gemini CLI integration buttons to Settings, refactoring the existing Claude Desktop integration into a generic MCP client system
- 65499f7: Code quality: Scryfall fetch dedup, parser framework, performance improvements, typed discriminator constants

  - Extract generic `fetchFromScryfall<T>()` helper, reducing 7 duplicate try/catch/404 patterns to one-liners
  - Add `parseLinesWithSections()` framework for line-based format parsers (Arena, MTGO, Simple)
  - Remove legacy `findCardInList`/`findCardIndexInList` re-export aliases
  - Add `buildRoleLookup()` for O(1) role lookups in view rendering loops
  - Derive `getCacheStats()` from CacheIndex instead of per-file statSync calls
  - Replace ~200 bare discriminator strings with typed `as const` objects across all packages
  - Add `DeckListName`, `INCLUSION_STATUS`, `OWNERSHIP_STATUS`, `FORMAT_TYPE`, `NOTE_TYPE`, `ADDED_BY`, `DECK_LIST`, `PARSER_SECTION` constants

- bbf49a3: Shared domain layer: unified business logic, composable validators, optimistic locking

  - Add `domain/` module with pure functions for card operations (add, remove, move, merge), commander management, and role CRUD
  - All operations are immutable — return new Deck via `OpResult<M>` with operation metadata
  - Add composable validators: deck size, sideboard size, card limits, commander presence, format legality, color identity
  - Validation is informational (two categories: structure, legality) — never blocks operations
  - Add `colorIdentity` field to `CardIdentifier` — every card carries its color identity from Scryfall
  - One-time migration populates `colorIdentity` on existing cards from Scryfall cache
  - Add optimistic locking to `saveDeck` with `ConcurrentModificationError`
  - Migrate MCP tools and Electron stores to use domain functions
  - Eliminate duplicated business logic between MCP server and Electron app

### Patch Changes

- 04ef890: Eliminate duplicate types, resolve remaining TODOs

  - Replace electron-app's ~450-line `src/types/index.ts` with a 2-line re-export from shared
  - Migrate `validateDeck` in MCP deck-tools to use domain `validateDeckStructure`
  - Extract `updateCardInDeck` domain function for immutable card field updates
  - Remove unused `consolidateDuplicateCards` (replaced by domain `mergeCardIntoList`)

- 2e3b8fd: Consolidate Storage: Electron app now uses shared Storage class

  - Delete duplicated `electron/storage.ts` (~1100 lines)
  - Electron app imports `Storage` from `@mtg-deckbuilder/shared` directly
  - Extract Electron-specific functions (file watching, export/import, pre-caching) to `electron/storage-extensions.ts`
  - Electron app gains: optimistic locking, UUID validation, getCacheStats optimization, proper types, unified migration path
  - Fix `migrateColorIdentity` null guards for decks with missing fields

- 0139ec5: Add versioned schema migration system for deck data

  - Add `schemaVersion` field to Deck type for tracking migration state
  - Add `migrations/` module with ordered migration registry and `runMigrations()`
  - Migrations run automatically on deck load (both MCP and Electron) and persist
  - Migration 001: populate default fields on deck notes (replaces render-time migrateDeckNote)
  - Remove ad-hoc migration functions (migrateLegacyPulledCards, migrateColorIdentity)
  - New migrations are added by creating a file and registering it — no Storage changes needed

- Updated dependencies [e1e2a00]
- Updated dependencies [04ef890]
- Updated dependencies [65499f7]
- Updated dependencies [2e3b8fd]
- Updated dependencies [bbf49a3]
- Updated dependencies [0139ec5]
  - @mtg-deckbuilder/shared@0.7.0

## 0.6.1

### Patch Changes

- cf4e5d1: Fixed missing oracle text for multi-faced cards (Rooms, split, flip, adventure, DFCs) by adding getOracleText utility that reads from card_faces when present
- b75c62b: Split interest list into separate scrollable list pane and fixed preview pane so card preview stays visible when scrolling. Added click-to-select so preview persists after clicking a card.
- 6838900: Fix Scryfall data not being cached when adding cards via MCP server
- 6b61f9d: Fix sideboard cards being invisible in Commander format decks by redirecting them to alternates when sideboardSize is 0
- Updated dependencies [cf4e5d1]
- Updated dependencies [b75c62b]
- Updated dependencies [6838900]
- Updated dependencies [6b61f9d]
  - @mtg-deckbuilder/shared@0.6.1

## 0.6.0

### Minor Changes

- 050aba5: Rename set_commanders to manage_commander with add, remove, and swap actions

  The MCP tool for managing commanders has been expanded from a single "add" operation into a full action-based tool supporting add, remove, and swap. Color identity is now recomputed from all remaining commanders when removing or swapping, which is important for partner commander decks.

- 08d9c54: Add Main Deck / Maybeboard toggle to Pull List view

  The Pull List now includes a toggle to switch between viewing cards from the main deck (including sideboard and commanders) or from the maybeboard (alternates only). This makes it easier to pull cards for maybeboard options separately from the main deck.

- 858b13f: Consolidate Scryfall module and add test coverage

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

### Patch Changes

- Updated dependencies [050aba5]
- Updated dependencies [08d9c54]
- Updated dependencies [858b13f]
  - @mtg-deckbuilder/shared@0.6.0

## 0.5.0

### Patch Changes

- 8e1f2e4: Document which parameters apply to which actions in manage_card tool
- fb3c39b: Document valid list names (mainboard, sideboard, alternates) for manage_card move action in tool description and improve error message when invalid list name is provided.
- 26b62fe: Improved tool descriptions for get_deck and view_deck to clarify when to use each
- 189bb4e: Fix role creation bug that caused corrupted state when id is undefined. Add update_custom and delete_custom actions for managing deck-specific roles.
- ad2ec7d: Reject incompatible move-related parameters on manage_card update action with clear error messages
- d4e14d4: Document `detail` parameter in view_deck tool description

  - Added note about `detail: "compact"` to include Oracle text for deck analysis
  - Makes the feature more discoverable for AI agents scanning tool descriptions

- Updated dependencies [d7760c7]
  - @mtg-deckbuilder/shared@0.5.0

## 0.4.0

### Patch Changes

- 91e70ef: Fix duplicate card entries in deck lists

  - MCP server's add and move actions now check for existing cards and merge instead of creating duplicates
  - Electron app's moveCard action now handles duplicates consistently
  - Added shared utilities: `findCardByName`, `findCardIndexByName`, and `consolidateDuplicateCards`

- Updated dependencies [de40ff7]
- Updated dependencies [91e70ef]
- Updated dependencies [d330831]
  - @mtg-deckbuilder/shared@0.4.0

## 0.3.0

### Minor Changes

- e890eb2: Rework `manage_card` tool to support batch operations via a new `cards` array parameter. All actions (add, remove, update, move) now accept multiple cards in a single call. The existing `name` parameter is preserved for backward compatibility.

  For the add action, cards use a `"[Nx ]<set_code> <collector_number>"` format (e.g. `"2x woe 138"`). For remove, update, and move actions, cards are specified by name.

### Patch Changes

- a8fc456: Add `unknown` as a new default ownership status for cards. Previously, cards defaulted to `need_to_buy` when added, which cluttered the buy list with unreviewed cards. Now cards default to `unknown` and must be explicitly triaged to `owned`, `pulled`, or `need_to_buy`.
- Updated dependencies [a8fc456]
  - @mtg-deckbuilder/shared@0.3.0

## 0.2.0

### Minor Changes

- 8e1a9ae: ### MCP Server

  - Added compact card format to deck views with detail level support (summary/compact/full)
  - Added search_decks_for_card tool and enhanced search_cards with Scryfall query auto-detection, UUID lookup, and set/collector number lookup
  - Split tools/index.ts into focused modules: deck-tools, card-tools, role-tools, commander-tools, interest-tools, note-tools, helpers, schemas, and types
  - Split views/index.ts into full-view, curve-view, notes-view, and formatters modules
  - Extracted shared helpers: getDeckOrThrow, fetchScryfallCard, createCardIdentifier, findCardInList

  ### Electron App

  - Split useStore.ts into Zustand slice pattern: deckSlice, cardSlice, commanderSlice, roleSlice, noteSlice, interestListSlice, configSlice, selectionSlice

  ### Shared

  - Extracted format parser utilities (prepareLines, getConfirmedCards, getMaybeboardCards) into formats/utils.ts
  - DRYed all five format parsers to use shared utilities

### Patch Changes

- Updated dependencies [8e1a9ae]
  - @mtg-deckbuilder/shared@0.2.0

## 1.0.0

### Major Changes

- d03264d: Initial release of MTG Deckbuilder Tools.

  - **Shared package**: Common types, Scryfall API client with rate limiting, and import/export parsers for Arena, Moxfield, Archidekt, MTGO, and simple text formats
  - **MCP Server**: 30+ tools for deck management, card operations, views, roles, notes, validation, and search — usable through Claude Desktop
  - **Electron App**: Desktop deck manager with card grid, mana curve visualization, role-based grouping, and one-click Claude Desktop integration
  - **Shared storage**: All packages read/write the same JSON files with optimistic locking

### Patch Changes

- 3b9aa90: Fix MCP server failing to start from DMG install by bundling it into a single file with esbuild.
- d03264d: Initial release of MTG Deckbuilder Tools.

  - **Shared package**: Common types, Scryfall API client with rate limiting, and import/export parsers for Arena, Moxfield, Archidekt, MTGO, and simple text formats
  - **MCP Server**: 30+ tools for deck management, card operations, views, roles, notes, validation, and search — usable through Claude Desktop
  - **Electron App**: Desktop deck manager with card grid, mana curve visualization, role-based grouping, and one-click Claude Desktop integration
  - **Shared storage**: All packages read/write the same JSON files with optimistic locking

- Updated dependencies [3b9aa90]
- Updated dependencies [d03264d]
- Updated dependencies [d03264d]
  - @mtg-deckbuilder/shared@1.0.0
