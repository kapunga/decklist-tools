# @mtg-deckbuilder/shared

## 0.10.1

### Patch Changes

- 201e590: Fix corrupted pnpm-lock.yaml and add build validation to CI

## 0.10.0

## 0.9.2

### Patch Changes

- e4765d0: Bump CI Node.js to 22 for pnpm 10.33 compatibility. The 0.9.1 release did not produce binaries because the build workflows were pinned to Node 20 while pnpm 10.33 requires Node 22.13+ (it imports `node:sqlite`, which was added in Node 22.5).

## 0.9.1

### Patch Changes

- 65c84f2: Upgrade runtime dependencies pulled in by Dependabot since the last release:

  - `react` 18.2 → 19.2.5 (electron-app)
  - `react-router-dom` 6.30 → 7.14 (electron-app)
  - `recharts` 2.15 → 3.8 (electron-app); fixes ManaCurve pie label to handle the new `percent: number | undefined` type
  - `tailwind-merge` 2.6 → 3.5 (electron-app)
  - `@tanstack/react-query` → 5.97 (electron-app)
  - `@modelcontextprotocol/sdk` → 1.29 (mcp-server)

## 0.9.0

### Minor Changes

- aa0789f: CI now runs the full workspace test suite on every pull request (`pnpm -r test`) instead of only the MCP server's tests. This brings shared (290 tests) and electron-app (25 tests) under CI coverage alongside mcp-server (146 tests) — 461 tests total per PR.
- 8130b41: Fix three MCP server issues surfaced by smoke testing:

  - `get_deck` now accepts a deck name again (case-insensitive) in addition to a UUID. The handler branches on UUID format instead of speculatively calling `Storage.getDeck`, which throws `Invalid deck ID format` on non-UUID input. Exposes a new `isValidUUID` helper from `@mtg-deckbuilder/shared`.
  - `manage_interest_list`, `manage_card`, and `manage_commander` now error out on a `name` / `set_code` + `collector_number` mismatch instead of silently adding the wrong printing. Matching is case-insensitive and accepts canonical name, flavor name (e.g. Final Fantasy crossover flavor names), and any face name for DFCs/MDFCs. Pass `force: true` to override.
  - `get_deck` payloads are substantially smaller. All MCP tool responses are now minified JSON (previously pretty-printed with 2-space indent) — this alone cuts `get_deck` for a 100-card commander deck from ~71 KB to ~41 KB with no shape change. `get_deck` also gains a `detail: "summary" | "full"` parameter defaulting to `summary`, which strips per-entry `id`, `addedAt`, `source`, and `pulledPrintings` — fields only useful for surgical edits or collection-pull tracking. A summary-minified commander deck is ~20 KB; `detail: "full"` preserves the previous shape.

  Also tightens the MCP test suite's mock `Storage` to mirror the real class's UUID-validation contract, so future regressions in this area are visible in CI.

- 8130b41: Split the `view_deck` MCP tool into four per-view tools: `deck_list`, `deck_curve`, `deck_notes`, and `deck_pull_list`. Each tool takes only the parameters relevant to its view — no more string `view` multiplexing.

  **Breaking change for MCP clients**: `view_deck` has been removed. Callers should migrate:

  - `view_deck(deck_id, view: "full", ...)` → `deck_list(deck_id, ...)`
  - `view_deck(deck_id, view: "curve", filters)` → `deck_curve(deck_id, filters)`
  - `view_deck(deck_id, view: "notes")` → `deck_notes(deck_id)`
  - `view_deck(deck_id, view: "pull-list")` → `deck_pull_list(deck_id)`

  **Key behavior change**: `deck_list` defaults `detail` to `compact` (was effectively `summary` via the formatter fallback). The new default includes oracle text on every card — the content LLMs actually want for deck analysis. Pass `detail: "summary"` for the old terse one-line form, or `detail: "full"` to additionally include set and rarity.

  `deck_notes` no longer loads the Scryfall cache (notes rendering doesn't need oracle text), saving N per-card cache lookups per call.

## 0.8.0

### Minor Changes

- 0201fce: CardEntry cleanup: tighten the type, replace `inclusion` with set membership, and fix the "cut all my Islands" bug

  **The bug fix.** The MCP `manage_card` move action no longer silently moves an entire stack when the agent meant a single card. When the source entry has more than one copy, an explicit `quantity` is now required — agents that say "cut Lightning Bolt" in commander still work (singletons), but "cut Island" fails loudly until the agent commits to a number.

  **`cut` is a real CardSet now.** Replaces the per-card `inclusion === 'cut'` flag with `cardSets[].name === 'cut'`. Cut cards live in their own holding pen, can carry notes explaining why they were cut, and are excluded from deck-size validation, color identity, and pull lists. The `manage_card` move action's `from`/`to` enums now accept `cut` as a value. Same for `considering` cards, which now live in `alternates` (the existing structural equivalent).

  **`CardEntry` is tighter.** `quantity`, `roles`, `source`, and `ownership` are now required (with sensible defaults via the new `makeCardEntry` factory). `inclusion`, `isPinned`, and the denormalized `typeLine` are gone. Type lines are now read on-demand from the Scryfall cache via the new `getTypeLine(entry, cache)` accessor — no more drift between stored and cached values.

  **MCP tool surface changes:**

  - `manage_card` lost the `status` argument (replaced by set membership via `move`).
  - `manage_card`'s `move` action gained `cut` as a valid `from`/`to` value, and now requires explicit `quantity` for multi-copy sources.
  - `manage_card` lost the `pinned` argument.
  - New tool reference doc at `specs/02-mcp-server.md`.

  **On-disk migrations** (run automatically on next deck load):

  - Migration 003 backfills `roles`/`source`/`quantity`/`ownership` defaults, strips `isPinned`, converts `inclusion === 'cut'` entries into the new `cut` set, and converts `inclusion === 'considering'` entries into `alternates`.
  - Migration 004 strips the denormalized `typeLine` field.
  - Both are idempotent and merge duplicate entries when set membership changes produce them.

  **Internal cleanup** (no user-visible behavior change):

  - Added `getCutList`, `getNonCutEntries`, `getTypeLine`, `getPulledPrintings`, `getPotentialDecks` accessors in shared.
  - Added `makeCardEntry` factory for centralized default handling.
  - Removed scattered `?? defaultValue` coalescing now that the type system enforces required fields.
  - Removed the `INCLUSION_STATUS` constant and `InclusionStatus` type (orphaned).
  - Rewrote validators, filters, format parsers, and views to read fields directly or via accessors instead of defending against undefined.
  - Collapsed the `### Confirmed` / `### Considering` subheadings in the full-view output (the structural separation of mainboard / alternates conveys the same intent).

- d18c9bd: Show color pips for all deck formats and fix colorless commander pip display
- a07d20c: Add a Cut tab to the deck detail UI so cut cards are visible and movable

  The card list refactor introduced a `cut` card set as a soft-delete area for cards the user removed from a deck but wanted to keep for recall, but no UI was added to view or populate it. Cards in the cut set were invisible to the Electron app — only the MCP `manage_card` tool could put cards there, and once placed they were unreachable from the UI. This fixes that.

  **New "Cut" tab in `DeckDetail.tsx`.** Slots between Sideboard (or Alternates, for decks with no sideboard) and Notes. Always visible regardless of cut count, mirroring how Alternates is always visible. The tab label shows the current cut count, e.g. `Cut (3)`. The tab content reuses the existing `DeckListView` component without modification — `DeckListView` was already generic over `CardSetName`, so it renders cut cards correctly without any branching.

  **"Move to Cut" in the per-card dropdown** (`CardItem.tsx`). Adds one more conditional `DropdownMenuItem` to the existing "Move to" submenu, gated by `listType !== CARD_SET.CUT`. From any non-cut tab, users can now cut individual cards; from inside the Cut tab, users can move cards back to Mainboard / Alternates / Sideboard via the existing menu items.

  **"Move to Cut" in the batch toolbar** (`BatchOperationsToolbar.tsx`). Adds Cut to the multi-select `moveTargets` array under the same guard. No `hasSideboard`-style format gate — Cut is format-independent.

  **No changes outside the three component files.** The store layer (`moveCard`, `batchMoveCards`), the domain layer (`getCutList`, `getNonCutEntries`), and the shared `CARD_SET` constant were already cut-aware from the prior refactor. `getCardCount` already excluded cut entries (it counts mainboard + commanders only), so cutting a card visibly drops the mainboard count and restores format validation headroom — matching the mental model that a cut card is no longer in the deck.

- 7aa43ab: Split dev and prod storage so development of the app no longer risks production deck data

  **Dev storage isolation.** In dev mode (`!app.isPackaged`), the Electron app now reads and writes to `<repo>/dev-storage/` instead of `~/Library/Application Support/mtg-deckbuilder/`. The prod app is unchanged. The dev storage directory is gitignored and created on first launch by the existing `Storage` constructor's `ensureDir` calls.

  **Dev MCP server registration.** When the dev Electron app registers its MCP server via the "Connect" buttons in Settings, it now writes to `<repo>/.mcp.json` under the server name `mtg-deckbuilder-dev`, and passes `--storage-dir <repo>/dev-storage` as a CLI arg. This lets Claude Code running inside the repo pick up the dev MCP server automatically without touching the user's global Claude Desktop / Claude Code / Gemini CLI configs, and lets a dev and prod MCP server coexist in the same `.mcp.json` under different server names. The prod registration path is byte-identical to before.

  **MCP server `--storage-dir` flag.** The MCP server now accepts a `--storage-dir <path>` CLI argument and passes it to `new Storage(...)`. Invocations without the flag fall back to the default prod path, so existing prod installs are unaffected.

  **Bug fix: `loadAllCardsToCache` crash on imported decks.** The "System → Scryfall Cache → Load All Cards" command crashed with `TypeError: deck.cards is not iterable` because two call sites in `packages/electron-app/electron/storage-extensions.ts` still referenced the pre-refactor `deck.cards` / `deck.alternates` / `deck.sideboard` fields. Both now use the `getAllDeckEntries(deck)` accessor from `@mtg-deckbuilder/shared`. This was a latent residue from the card list refactor that only surfaced on the rarely-exercised bulk-cache path.

- 5a5c779: Display flavor names as primary card names for special printings (e.g., Final Fantasy crossover)
- 0df4c87: Bridge the on-disk Scryfall cache to the Electron renderer so card type lines resolve instantly without network fetches

  **The bug.** The Electron renderer's `useScryfallCache` hook used React Query's `useQueries` with `queryFn: () => getCardById(id)`, which is a straight `fetch()` against `https://api.scryfall.com/cards/{id}`. It never read from the local on-disk Scryfall cache that `Storage.getCachedCard()` maintains. Every deck open kicked off ~100 parallel network fetches, and while in flight (or after silent failures), cards had no resolved type line and fell into the `Other` group in `DeckListView`. The "System → Scryfall Cache → Load All Cards" command populated the on-disk cache (good for the MCP server) but did nothing for the Electron UI because the UI ignored that directory entirely. Most visible on decks with many recent printings — the Final Fantasy commander deck made it impossible to miss.

  **The fix.** Added a new `cache:get-cards` IPC handler in the Electron main process that takes a batch of `scryfallId`s and returns the cached subset as a plain record (misses are silently dropped). Wired it through `preload.ts` and the renderer-side ambient type in `vite-env.d.ts`. Rewrote `useScryfallCache` to call the IPC bridge via plain `useState` + `useEffect` (with a cancellation flag for deck switches) instead of React Query. The hook's return shape (`{ cache, isLoading }`) is unchanged, so neither `DeckListView` nor `DeckStats` (the two consumers) needed any modifications.

  **Net result.** Cached cards now resolve instantly with one batched IPC round-trip per deck render and zero network calls. `Load All Cards` actually benefits the UI now. Two consumers, one new file path, zero behavior change for cache hits.

  **Out of scope (deferred to follow-ups).**

  - No network fallback on cache miss yet — missing cards still fall into the `Other` group, same as the existing transient state, just permanent until the user re-runs `Load All Cards`. A proper fallback would need a write-back IPC and race-condition handling.
  - `usePullList.ts` still uses React Query to fetch printings by name via `getCardPrintings(name)` — same architectural smell, different IPC shape needed, separate branch.
  - The renderer doesn't yet subscribe to file-watcher events for cache writes, so cards cached by the MCP server while the Electron app is open won't appear until the user re-opens the deck.

- 01183fc: Split types into dedicated files and unify PullListItem/PullListGroup into shared package

### Patch Changes

- a93877b: Fix pull list and card merge bugs

  - Fix commander pull not reflecting in UI by removing over-restrictive printing filter
  - Fix pull list hiding "considering" cards by aligning filter with main deck list (exclude only "cut")
  - Remove collection level rarity filtering from pull list (collection level is advisory, not a hard gate)
  - Fix card merge not upgrading inclusion status when re-adding an existing card

## 0.7.0

### Minor Changes

- e1e2a00: Add Claude Code and Gemini CLI integration buttons to Settings, refactoring the existing Claude Desktop integration into a generic MCP client system
- 04ef890: Eliminate duplicate types, resolve remaining TODOs

  - Replace electron-app's ~450-line `src/types/index.ts` with a 2-line re-export from shared
  - Migrate `validateDeck` in MCP deck-tools to use domain `validateDeckStructure`
  - Extract `updateCardInDeck` domain function for immutable card field updates
  - Remove unused `consolidateDuplicateCards` (replaced by domain `mergeCardIntoList`)

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

- 0139ec5: Add versioned schema migration system for deck data

  - Add `schemaVersion` field to Deck type for tracking migration state
  - Add `migrations/` module with ordered migration registry and `runMigrations()`
  - Migrations run automatically on deck load (both MCP and Electron) and persist
  - Migration 001: populate default fields on deck notes (replaces render-time migrateDeckNote)
  - Remove ad-hoc migration functions (migrateLegacyPulledCards, migrateColorIdentity)
  - New migrations are added by creating a file and registering it — no Storage changes needed

### Patch Changes

- 2e3b8fd: Consolidate Storage: Electron app now uses shared Storage class

  - Delete duplicated `electron/storage.ts` (~1100 lines)
  - Electron app imports `Storage` from `@mtg-deckbuilder/shared` directly
  - Extract Electron-specific functions (file watching, export/import, pre-caching) to `electron/storage-extensions.ts`
  - Electron app gains: optimistic locking, UUID validation, getCacheStats optimization, proper types, unified migration path
  - Fix `migrateColorIdentity` null guards for decks with missing fields

## 0.6.1

### Patch Changes

- cf4e5d1: Fixed missing oracle text for multi-faced cards (Rooms, split, flip, adventure, DFCs) by adding getOracleText utility that reads from card_faces when present
- b75c62b: Split interest list into separate scrollable list pane and fixed preview pane so card preview stays visible when scrolling. Added click-to-select so preview persists after clicking a card.
- 6838900: Fix Scryfall data not being cached when adding cards via MCP server
- 6b61f9d: Fix sideboard cards being invisible in Commander format decks by redirecting them to alternates when sideboardSize is 0

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
