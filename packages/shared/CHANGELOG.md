# @mtg-deckbuilder/shared

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

## 0.4.0

### Minor Changes

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

- 91e70ef: Fix duplicate card entries in deck lists

  - MCP server's add and move actions now check for existing cards and merge instead of creating duplicates
  - Electron app's moveCard action now handles duplicates consistently
  - Added shared utilities: `findCardByName`, `findCardIndexByName`, and `consolidateDuplicateCards`

## 0.3.0

### Patch Changes

- a8fc456: Add `unknown` as a new default ownership status for cards. Previously, cards defaulted to `need_to_buy` when added, which cluttered the buy list with unreviewed cards. Now cards default to `unknown` and must be explicitly triaged to `owned`, `pulled`, or `need_to_buy`.

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
