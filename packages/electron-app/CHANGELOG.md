# @mtg-deckbuilder/electron-app

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

- 2e3b8fd: Consolidate Storage: Electron app now uses shared Storage class

  - Delete duplicated `electron/storage.ts` (~1100 lines)
  - Electron app imports `Storage` from `@mtg-deckbuilder/shared` directly
  - Extract Electron-specific functions (file watching, export/import, pre-caching) to `electron/storage-extensions.ts`
  - Electron app gains: optimistic locking, UUID validation, getCacheStats optimization, proper types, unified migration path
  - Fix `migrateColorIdentity` null guards for decks with missing fields

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
- 894f900: Fix pull list crash when Scryfall card has undefined type_line
- 6838900: Fix Scryfall data not being cached when adding cards via MCP server
- 6b61f9d: Fix sideboard cards being invisible in Commander format decks by redirecting them to alternates when sideboardSize is 0
- Updated dependencies [cf4e5d1]
- Updated dependencies [b75c62b]
- Updated dependencies [6838900]
- Updated dependencies [6b61f9d]
  - @mtg-deckbuilder/shared@0.6.1

## 0.6.0

### Minor Changes

- 050aba5: Add consistency matrix to deck stats

  New stats module in shared package with role/type consistency analysis. Electron app gains a ConsistencyMatrix component and HeatmapTable for visualizing card role distribution in DeckStats. Also adds role validation utilities with test coverage.

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

### Minor Changes

- d7760c7: Add Scryfall cache management for offline card data and images

  - Cache index system enables lookup by card name or set+collector number
  - Image caching stores card images locally for offline viewing
  - New Cache Settings section in Settings page (under System tab)
  - Display cache statistics (card data count/size, image count/size)
  - "Load All Cards" button pre-caches all cards from all decks with progress bar
  - Per-deck "Cache" dropdown to cache individual deck's cards and images
  - Clear cache buttons for card data, images, or both
  - Rebuild index button to regenerate cache lookups
  - Custom `cached-image://` protocol serves cached images securely
  - Content Security Policy added for production builds
  - Settings page reorganized into tabs: Collection, Agent Integration, System

### Patch Changes

- 4ac1cc5: Add separator between mana costs for double-faced cards in Pull List

  - Double-faced cards now display both faces' mana costs with a `//` separator
  - For example, "Delver of Secrets" shows `{U} // {U}` instead of just `{U}`

- Updated dependencies [d7760c7]
  - @mtg-deckbuilder/shared@0.5.0

## 0.4.0

### Minor Changes

- 9507be8: Add destination selection when adding cards

  - CardAddModal now shows radio buttons to choose where to add a card: Mainboard, Sideboard, or Maybeboard
  - Default destination is based on the currently active tab (e.g., viewing Alternates tab defaults to Maybeboard)
  - Sideboard option only appears for formats with sideboard support (not Commander)
  - Added RadioGroup UI component based on Radix UI

- 86a603e: Add card edit modal with printing selection

  - New CardEditModal component for editing card details (quantity, notes, roles, ownership)
  - Added printing selector dropdown showing all available printings with set code, collector number, and set name
  - Added `getCardPrintings` function to query Scryfall for all printings of a card
  - Edit button added to both Grid view (CardItem menu) and List view (CardRow pencil icon)
  - Fixed ownership badge layout shift in list view by using fixed-width container

- 1eec367: Add Pull List view for tracking cards to pull from collection

  - New Pull List tab in deck detail view shows cards grouped by set
  - Displays quantity needed, quantity pulled, and remaining for each card
  - Filter by rarity (mythic, rare, uncommon, common) and hide fully pulled cards
  - Click rows to preview card image with pulled/needed counts
  - Mark individual prints as pulled with quantity tracking modal
  - "Mark All Pulled" button to quickly complete entire sets
  - MCP server includes new pull-list-view for Claude to render pull lists
  - Shared package adds pull tracking types and storage functions

- d330831: Add ownership status filter to card filter bar

  - New "Ownership" filter in the deck list view filter bar
  - Filter by Unknown, Owned, Pulled, or Buylist status
  - Supports both Include and Exclude modes
  - Added 'status' filter group containing the ownership filter type

### Patch Changes

- de40ff7: Fix bimodal card type categorization

  - Cards with dual type lines (Adventures, Omens, MDFCs) now prioritize permanent types over spell types
  - For example, "Land // Instant" cards like Lindblum now categorize under Land instead of Instant
  - Updated `getPrimaryType` in both shared package and electron-app

- 5c0a8ba: Clear selection after batch operations in multi-select toolbar

  - Added selection clearing to batchUpdateOwnership and batchAddRoleToCards
  - Now all batch operations (ownership, delete, move, add role) dismiss the toolbar after completing

- 1753899: Improve Settings page layout and usability

  - Fix sticky header transparency issue in set collection table
  - Compact global roles into pill-shaped chips with multiple per row
  - Add deck count indicator with layers icon on role chips
  - Show role description and usage details in hover tooltip
  - Click role chip to edit, hover to reveal delete button

- 91e70ef: Fix duplicate card entries in deck lists

  - MCP server's add and move actions now check for existing cards and merge instead of creating duplicates
  - Electron app's moveCard action now handles duplicates consistently
  - Added shared utilities: `findCardByName`, `findCardIndexByName`, and `consolidateDuplicateCards`

- 09ece9c: Fix invisible tooltip in mana curve charts

  - Styled Recharts tooltips to match the app's dark theme
  - Tooltips now use proper dark background and light text colors
  - Fixed issue where default white tooltip appeared as an empty box

- 14b89c2: Fix notes column alignment in deck list view

  - Changed role section to fixed width so notes column stays aligned regardless of role pill count

- f5499dd: Fix window drag and titlebar layout

  - Added proper titlebar drag region so the window can be dragged
  - Increased left padding on navigation header to clear macOS traffic lights

- Updated dependencies [de40ff7]
- Updated dependencies [91e70ef]
- Updated dependencies [d330831]
  - @mtg-deckbuilder/shared@0.4.0

## 0.3.0

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
