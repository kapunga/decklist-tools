# @mtg-deckbuilder/mcp-server

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
