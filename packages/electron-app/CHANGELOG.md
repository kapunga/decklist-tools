# @mtg-deckbuilder/electron-app

## 0.12.6

### Patch Changes

- 441d3d5: Fix the packaged macOS `.app` bundle, DMG, and Windows executable being named `mtg-deckbuilder` instead of `MTG Deckbuilder` in v0.12.5. The top-level `executableName` added to fix a Linux-only packaging failure (scoped package name `@mtg-deckbuilder/electron-app` sanitizing to an invalid `@`-prefixed executable name) also fed electron-builder's `productFilename`, which every platform's output artifact naming derives from — not just Linux's. `executableName` is now scoped to `build.linux` only, so Linux packaging still gets an explicit safe name while macOS and Windows artifacts fall back to `productName` ("MTG Deckbuilder") as before.
- Updated dependencies [441d3d5]
  - @mtg-deckbuilder/shared@0.12.6

## 0.12.5

### Patch Changes

- 6d18e6f: Document Scryfall's 500-character query limit in the `scryfall-search` skill (cause and mitigation), with a pointer from `mtg-deckbuilder-lookup` near `get_collection_filter`, the most common source of long `OR`-chains that hit it.
- 99b835a: Fix skill export build failure after the `archiver` 8.0.0 bump dropped its `default` export. `zipDirectory` now imports the `ZipArchive` class and constructs it directly (`new ZipArchive({ zlib: { level: 9 } })`) instead of calling the removed `archiver('zip', options)` factory function.
- 42642fd: Fix the Buy List view only showing "need to buy" cards from a deck's mainboard. `useBuyList` scanned `getMainboard(deck)`, so cards flagged `need_to_buy` in the `alternates` or `sideboard` sets — where this ownership tag is actually used most often — never appeared. It now scans `getNonCutEntries(deck)` (mainboard + sideboard + alternates, excluding the cut pile), matching the scope `DeckStats` already uses for its own "cards needing purchase" count.
- 83d45f3: Fix `validateCardLimits` flagging legal decks as invalid because it counted copies across `alternates` (a consideration list, not part of the deck under format rules) alongside mainboard and sideboard. It also missed a card that appears both as a commander and in the mainboard, which should trip the singleton limit but previously didn't since commanders live outside `cardSets`. The check is now scoped to mainboard + sideboard + commanders.
- 089ecf8: Fix collection levels (1-4) being used as a hard rarity filter instead of a likelihood hint. `get_collection_filter` baked `r:common OR r:uncommon...` into the generated Scryfall query per set, and the pull list view (`deck_pull_list`) silently dropped any owned-set printing whose rarity exceeded the tracked level — both presented an educated guess about how deeply a user has engaged with a set as certainty about which specific cards they own. `get_collection_filter` now scopes queries by set only (also keeping generated queries well under Scryfall's 500-character limit), while still returning each set's level/rarities as metadata; the pull list now includes higher-rarity printings from owned sets, flagged as lower-confidence rather than excluded.
- 90ca0fa: Fix packaging failure after the `electron-builder` 26.15.3 bump. With no explicit `executableName` set, electron-builder derives the packaged binary's name from `package.json`'s `name` field on Linux (`appInfo.sanitizedName`) rather than `productName` — and unlike the sibling `linuxPackageName` getter, that path has no guard for scoped package names, so `@mtg-deckbuilder/electron-app` sanitized down to `@mtg-deckbuilderelectron-app`, an `@`-prefixed name electron-builder now rejects as an unsafe file path. `executableName` is now set explicitly to `mtg-deckbuilder` in the `build` config, so packaging no longer depends on that derivation.
- Updated dependencies [6d18e6f]
- Updated dependencies [99b835a]
- Updated dependencies [42642fd]
- Updated dependencies [83d45f3]
- Updated dependencies [089ecf8]
- Updated dependencies [90ca0fa]
  - @mtg-deckbuilder/shared@0.12.5

## 0.12.4

### Patch Changes

- 707d770: Drop the `arena` and `mtgo` export formats from the MCP `deck_export` tool, matching the desktop app's export menu — Arena has no usable import flow to paste into, and MTGO's import is offline-client-only. `deck_export` now accepts only `moxfield`, `archidekt`, and `simple` (enforced by the existing format validator). The `mtg-deckbuilder-decks` skill and the docs are updated to match.
- 2a6f98c: Fix `ConcurrentModificationError` when importing decks. `Storage.saveDeck` now returns the persisted deck (with the incremented version) instead of mutating its argument and returning `void`, so the Electron renderer no longer holds a stale version across the IPC boundary. Both import flows now save the deck a single time — importing into an existing deck folds every card into one save (previously a per-card loop that silently failed after the first card while still reporting success), and creating a deck from an import builds it fully in memory before one save (previously a create-then-update sequence that conflicted on the second save). Pull-list mutations route through the same single-save path.

  Also fix a "Maximum update depth exceeded" error that could surface during an import: the storage file watcher no longer broadcasts writes to the derived Scryfall cache (`cache/`), which `loadData` never reads — importing caches many cards at once, and reloading per cache file triggered a render storm. Storage-change reloads are now debounced, and a successful load clears any prior error so the app recovers cleanly.

- Updated dependencies [707d770]
- Updated dependencies [2a6f98c]
  - @mtg-deckbuilder/shared@0.12.4

## 0.12.3

### Patch Changes

- 6422a02: Add OpenAI Codex CLI as a one-click assistant. Settings → MCP Server and Settings → Skills now connect and install to Codex (`~/.codex/config.toml` and `~/.codex/skills`). Because Codex stores its config as TOML — alongside the user's model and provider settings — connecting merges the deckbuilder in rather than overwriting; this is covered by new unit tests. Docs updated across the assistants, installation, settings, and skills pages, including a note that the ChatGPT desktop app does not support local MCP servers (use the Codex CLI instead).
- Updated dependencies [6422a02]
  - @mtg-deckbuilder/shared@0.12.3

## 0.12.2

### Patch Changes

- 1da317f: Fix infinite render loop (React #185) when viewing a deck. `useScryfallCache` now keys its fetch effect on a stable id signature instead of an array reference, so it no longer re-runs every render and loops via `setCache`.
- Updated dependencies [1da317f]
  - @mtg-deckbuilder/shared@0.12.2

## 0.12.1

### Patch Changes

- 8d3b28d: Fix packaged app crashing on launch with "Cannot find module 'archiver'". electron-builder's dependency collector can't resolve the pnpm workspace, so externalised main-process modules were missing from the packaged build. `archiver` is now bundled into the Electron main process instead of left external.
- Updated dependencies [8d3b28d]
  - @mtg-deckbuilder/shared@0.12.1

## 0.12.0

### Minor Changes

- dd5ce17: Broadsheet shell redesign for the deck-list page (#146).

  The top horizontal tab nav has been replaced with a collapsible left sidebar.
  The deck-list page header has been reworked in an editorial broadsheet
  typographic register: italic display title sized to the page, italic
  theme-keyed tagline ("twelve in the library", "twelve in the crypt", etc.),
  a 2px masthead rule below the title, and caption-uppercase labels on filter
  controls. The shell consumes new per-theme tokens (`--action-bg`,
  `--action-fg`, `--masthead-rule-color`), with cyberpunk-specific overrides
  that switch nav labels to JetBrains Mono caps and rules to neon cyan.

  ### Behavior changes

  - New left sidebar with brand wordmark, primary nav (Decks, Interest List,
    Buy List), and a bottom dock containing Settings + a theme indicator.
  - Sidebar collapses to a 64px icon rail via the chevron at top-right of the
    brand row.
  - Filter row in the deck list adopts borderless inputs: search is now a
    hairline-bottom field with an italic placeholder; format dropdown and
    status toggle render as inline text-with-chevron rather than boxed
    controls. Color identity pip circles preserved.

  ### Notes

  - Settings remains a sidebar destination for now; it will move to its own
    native window once #160 lands.
  - Interest List will rename to Lists when #139 lands; only the sidebar label
    changes at that point.
  - Tile-level deck cards untouched in this pass — the chrome around them is
    the focus of #146.

- 27d3ba2: Add a card-art picker dialog accessible from each deck tile's `⋮` menu (the **Set deck art...** item that was deferred when the menu shipped). The picker lets you pick any card from the deck and then any printing of that card — including printings that aren't in the deck — so the tile's hero art is fully decoupled from your playing copy.

  ### Highlights

  - **Inline-accordion card list, dropdown of distinct illustrations.** Printings are deduplicated by `illustration_id` so a card with 50+ reprints collapses to its handful of unique artworks. Non-promo printings are preferred as the canonical representative for an illustration; canonicals are sorted newest-first in the dropdown.
  - **DFC handling.** For double-faced cards (`transform` / `modal_dfc` / `reversible_card`), the dropdown emits one option per front-face illustration, and the preview shows both faces side-by-side. Clicking either face selects which one gets persisted.
  - **Flip-card handling.** Champions-of-Kamigawa-style flip layouts emit upright + flipped options per illustration; the saved face value renders the tile rotated 180°.
  - **Smart bootstrap.** Modal opens with whatever art is currently displayed: the saved override if one exists (with the matching deck row auto-expanded), otherwise the commander-resolved default.
  - **Visual selection indicator.** The pending face is marked with a focus ring; for DFCs both faces remain visible while only one carries the ring.

  ### Schema

  `ScryfallCard` extended with optional `illustration_id`, `artist`, `released_at`, and `promo` fields populated directly from Scryfall API responses. Additive only; no migration needed.

- 2963e64: Extend Broadsheet design language into the deck-detail body (#162). The card list inside the Cards / Alternates / Sideboard / Cut tabs now matches the masthead's editorial register: newspaper-section group headers replace Badge pills (closes #176), Buy/Pulled badges use theme tokens (closes #177), role chips become sharp-cornered with color-mixed tints, the focused-card panel gains editorial framing with name / type-line / cost / printing / roles meta rows, the filter bar adopts caption-label + italic value cells, and the batch operations toolbar is restyled as a sharp-cornered bubble with caption-tag verbs separated by hairline dividers. Adds `captionLabelStyle` and `editorialTextStyle` to the shared style module.
- 2963e64: Rework the deck-detail page masthead into Broadsheet's editorial grammar (#162). Italic display title with theme-keyed tagline and commander byline, 2px masthead rule, caption-uppercase action cluster with the per-theme action button on Import, italic status line replacing the round-pill progress bar, and newspaper-section-label tabs split into primary card-set and secondary tools clusters. Adds `--font-tagline` (so Cyberpunk's italic register can fall through to JetBrains Mono since Space Grotesk has no italic axis) and `--pip-backplate` (so color-identity pips read on dark themes). Sweeps up hardcoded Tailwind palette colors in the validation and cache-result notifications. Body-layer follow-ups tracked under #176-#179.
- de3589d: Add deck export — copy to clipboard or save to file in the formats whose
  import flows we can target.

  In the desktop app, deck detail gains an **Export** dropdown alongside Cache
  and Roles. Copy-to-clipboard is the primary path (designed for paste into
  Moxfield/Archidekt import boxes); Save-to-file writes a `.txt` via the native
  save dialog.

  ### Format-specific notes

  - **Moxfield** — its import UI accepts each section into a separate paste box
    (mainboard, sideboard, maybeboard), so the dropdown surfaces one menu item
    per non-empty section. Output follows Moxfield's documented deck-import
    grammar (`AMOUNT CARDNAME (SETCODE) NUMBER *F*`); the prior CSV
    implementation was wrong (CSV is for collection import, not decks) and has
    been replaced.
  - **Archidekt** — emits `Nx CARDNAME (SET) NUMBER`. Role tags are intentionally
    not emitted: Archidekt's parser greedy-matches between the first and last
    caret on a line, so any card with two-plus tags would fail to import. Tag
    alignment across deckbuilders is tracked in a separate ticket. Structural
    brackets (`[Commander]`, `[Sideboard]`, `[Maybeboard]`) are retained so
    Archidekt can bucket cards correctly.
  - **Simple Text** — generic plain-text decklist, useful for any importer that
    accepts bare `N CardName` lines.
  - **Arena and MTGO** — registered as formats so import auto-detect still
    works, but **not surfaced for export**. Mythic Tools (the historical pair
    for the Arena format) doesn't have an end-user import flow we can target,
    and MTGO's import is offline-client-only.

  ### Renderer API

  `RenderOptions` gains an optional `section: 'mainboard' | 'sideboard' |
'maybeboard'` for tools whose import UI is section-scoped. When omitted, the
  renderer emits the full deck (existing behaviour, used by the MCP tool and
  non-Moxfield formats).

  ### MCP

  A new `deck_export` tool returns `{ format, content, lineCount, … }` so
  Claude-driven workflows can render decks programmatically. The tool accepts
  the same `section` argument as the UI, so an LLM can request just the
  sideboard if needed.

- 9c06574: Add filter controls to the deck list page.

  The deck list header now AND-combines four filters:

  - **Search** (existing) — matches deck name and archetype.
  - **Format** — `Select` dropdown over All / Commander / Standard / Pioneer / Modern / Legacy / Pauper / Kitchen Table.
  - **Status** — segmented control for All / Complete / Incomplete. _Complete_ is derived from `getCardCount(deck) === deck.format.deckSize` (no schema change).
  - **Color identity** — checklist of WUBRG mana pips plus a colorless pip.

  ### Color filter behavior

  Each WUBRG pip cycles through three states on successive clicks: **off → required → excluded → off**. Required pips render at full opacity; excluded pips render at full opacity with a diagonal red strike-through (drawn via a CSS linear-gradient using the theme's `--destructive` token, so the strike retunes per theme). Multiple selections AND together — for example, requiring G and excluding B shows green decks that don't include black.

  The colorless (C) pip is binary on/off and mutually exclusive with WUBRG state. Clicking it clears any WUBRG filter and shows only decks with empty color identity; clicking a WUBRG pip while colorless is active swaps modes (colorless cleared, that color set to _required_).

  All filter state is local to `DeckList` — these are view settings, not deck data, and reset on navigation away.

- 21150c3: Denormalize a card's primary type bucket onto each `CardEntry` so type-aware
  UI no longer depends on a populated Scryfall cache.

  Previously, deck-list grouping, type filters, and mana-base analytics looked
  up `type_line` in an in-memory `scryfallCache`. That cache is read-only against
  disk via the `cache:get-cards` IPC, so newly-added cards (whose Scryfall data
  hadn't been pre-cached) silently bucket as **Other** until a manual
  "Pre-cache deck" pass.

  ### Schema

  - `CardEntry.primaryType?: PrimaryType` — optional, backward-compatible.
  - New `PrimaryType` union (`'Creature' | 'Planeswalker' | 'Battle' |
'Artifact' | 'Enchantment' | 'Land' | 'Instant' | 'Sorcery' | 'Other'`)
    exported from `@mtg-deckbuilder/shared`.
  - `getPrimaryType(typeLine)` in shared now returns the typed `PrimaryType`
    union instead of `string`.

  ### Migration 006: `denormalize-primary-type`

  Backfills `primaryType` on every existing `CardEntry` by looking up its
  `type_line` in the on-disk Scryfall cache. Cards whose data isn't on disk
  at migration time stay without a `primaryType` field; readers fall back to
  a live cache lookup via the new `getEntryPrimaryType(entry, cache)`
  accessor, so UI still resolves correctly once the cache fills. Idempotent.

  This deliberately reverses migration 004 (`strip-typeline`). The earlier
  strip was safe-by-construction for an unknown set of writers (including
  the now-archived Scala MCP server). All current writers resolve a full
  ScryfallCard before constructing entries, so denormalizing the bucket no
  longer risks empty fields on write.

  ### Writer updates

  All four CardEntry construction sites populate `primaryType` from the
  Scryfall card they already have in scope:

  - `manage_card add` (MCP `card-tools.ts`)
  - `manage_interest_list add` (MCP `interest-tools.ts`)
  - Card-add modal (`QuickAdd.tsx`)
  - Deck import (`useImportCards.ts`)

  ### Reader updates

  - `DeckListView` grouping → `getEntryPrimaryType(entry, scryfallCache)`
  - `CardFilterBar` type filter → prefers `entry.primaryType`, falls back
    to deriving from the resolved Scryfall card
  - `ConsistencyMatrix` land count → `getEntryPrimaryType(entry, cache) === 'Land'`

  ### Dead-code cleanup

  `getPrimaryType`, `getTypeSortOrder`, and `CARD_TYPE_ORDER` in
  `packages/electron-app/src/lib/constants.ts` were duplicates of the same
  helpers in `@mtg-deckbuilder/shared`. The local copies had no callers
  once the readers above switched to the shared accessor and have been
  removed. `CARD_TYPE_SORT_ORDER` (still used by `CardGrid` and
  `DeckListView`) stays.

- 7601e0f: Add support for flip-layout cards (Champions of Kamigawa style — Akki
  Lavarunner / Tok-Tok, Volcano Born; Bushi Tenderfoot / Kenzo the
  Hardhearted; etc).

  Unlike DFCs, flip cards have a single Scryfall image with the alternate
  face drawn upside-down on the bottom half. "Flipping" them is a 180°
  rotation of the same image, not a fetch of a different URL.

  ### Deck art (`DeckCardPreview`)

  The hover flip button now appears on flip-layout deck art (it previously
  only handled `transform` / `modal_dfc` / `reversible_card`). Toggling it
  on a flip card stores `artCardFace: 'flipped'`, which renders the front
  URL with `transform: rotate(180deg)`.

  ### Card preview modal (`CardImage`)

  The flip button now appears on flip-layout cards in the preview modal,
  rotating the image in place rather than seeking a non-existent back URL.

  ### Type changes (`@mtg-deckbuilder/shared`)

  - `Deck.artCardFace` widens from `'front' | 'back'` to a new
    `ArtCardFace = 'front' | 'back' | 'flipped'` union. Existing values
    remain valid; no migration needed.
  - New `TWO_FACED_LAYOUTS` and `ROTATED_LAYOUTS` constants codify which
    layouts use which strategy.
  - New `isArtCardFaceValid(face, layout)` validator. The deck-tile
    toggle is correct by construction, but the validator gates the
    render-side fallback: if a stored face is incoherent with the
    resolved card's layout (e.g. art card was swapped to a card with a
    different layout), the renderer falls back to `'front'` instead of
    mis-rendering. Storage is not rewritten on the fly — the next
    explicit toggle overwrites cleanly.

- 83274b0: Generalize the Interest List into a Lists section. Each `CardList` now carries
  an optional `kind` (`interest` | `collection` | `scan` | `wishlist` | `custom`)
  that drives default descriptions and UI affordances. The Electron app gains a
  new Lists index, per-list create/rename/delete, per-list decklist import, and a
  format-legality panel showing union/intersection legality across the list's
  cards. The MCP `get_interest_list`/`manage_interest_list` tools are replaced by
  generic `list_card_lists`, `get_card_list`, and `manage_card_list` tools.

  Also adds a new **Mythic Tools (CSV)** import format scoped to list imports —
  parses the Mythic Tools collection-export CSV using only the card-identifying
  fields (name, set code, collector number, quantity); price/condition/container
  data is ignored. The Electron app's stale duplicate of the formats module was
  deleted in favor of the shared package's implementation.

- 30d8c3a: Install bundled skills into Claude Code, Gemini CLI, or any other harness from Settings.

  The app now ships with six SKILL.md skills under `skills/` and surfaces them in a new Settings → Skills section. Each skill can be installed per-client into `~/.claude/skills/` or `~/.gemini/skills/`, or exported as a `.zip` for Claude Desktop's Capabilities UI / any harness that reads SKILL.md bundles.

  ### Behavior changes

  - New **Skills** sidebar section in Settings with a table: one row per bundled skill, three action columns (Claude Code, Gemini CLI, Export), and an "All skills" bulk-action header row.
  - The previous **Integrations** section has been renamed to **MCP Server** and now contains only the three MCP connection cards. The previous `integrations` persisted section key migrates transparently to `mcp-server`.
  - Per-skill info button surfaces the SKILL.md `description:` frontmatter as a hover tooltip.
  - Install state is tracked in a new `skills-installed.json` manifest under the user's storage directory. Uninstall only removes skills the app installed — third-party skills in the same target directory are never touched.

  ### Versioning

  - Skills carry a `metadata.version` field per the [agentskills.io spec](https://agentskills.io/specification). The current convention is date-based (`metadata.version: "YYYY-MM-DD"`); bump it when the SKILL.md content meaningfully changes.
  - The Settings table compares each skill's bundled version against the installed version and surfaces an **Update** button when they differ. Skills without a `version:` field fall back to the app version.

  ### Staleness check from inside a session

  A new MCP tool, `list_bundled_skills`, returns the currently-bundled skill inventory (`name`, `version`, `description`) so an installed skill (or the user) can ask "is my local copy current?" without leaving the chat. Compare the returned `version` against the `metadata.version` in your local SKILL.md and reinstall through Settings → Skills if newer. The tool reads from the same `skills/` directory the Electron app installs from; Electron passes `--skills-dir` when it spawns the MCP server. Existing MCP integrations need to disconnect + reconnect in Settings → MCP Server to pick up the new flag.

  ### Notes

  - Claude Desktop currently has no documented filesystem skills directory; the Export column writes a `.zip` via a save dialog and reveals it in Finder for manual upload to Claude Desktop's Capabilities UI.
  - The bundled `skills/` directory ships as a packaged-app resource via electron-builder's `extraResources`.
  - New runtime dep: `archiver` (pinned to `^7.0.1` — v8 is ESM-only and breaks the factory-function API).
  - SKILL.md descriptions must not contain angle-bracket placeholders (e.g. `function:<tag>`) — Claude Desktop's uploader rejects them as XML. Drop the placeholder or describe in plain words.

- de3589d: Populate the Electron app's native menu bar with File / Edit / View / Help
  menus and standard keyboard shortcuts.

  - **File**: New Deck (Cmd+N), Import Deck… (Cmd+I), Export Deck… (Cmd+E,
    enabled only while a deck is open), Quit.
  - **Edit**: standard system roles (Cut/Copy/Paste/Undo/Redo/Select All) plus
    Find (Cmd+F) which focuses the deck-list search.
  - **View**: a Theme submenu (one entry per shipped theme), zoom in/out/reset,
    full-screen, toggle DevTools.
  - **Help**: About dialog, GitHub link, Documentation link.

  Menu items send an IPC `menu:action` message which a top-level App listener
  routes through the store. Each action increments a dedicated token counter
  that the owning component (DeckList for new/import/find, DeckDetail for
  export) watches via `useEffect`.

- a63b2fa: Move Settings into its own native window, opened from the App menu (`Cmd+,`
  on macOS, `Ctrl+,` elsewhere) or the existing gear icon in the sidebar.

  - **Native chrome.** The Settings window uses default OS window framing —
    standard titlebar, traffic lights in their conventional position — rather
    than the main window's `hiddenInset` style, so it reads as a native
    Settings window.
  - **Modeless.** The user can keep Settings open while interacting with the
    main window; both windows stay live and share state.
  - **Persisted bounds.** The window's size and position are saved to
    `settings-window-state.json` in the storage dir on close and restored on
    next open.
  - **Cross-window state-sync.** `storage:changed` and `cache:load-progress`
    IPC events now broadcast to all renderer windows (via `BrowserWindow.
getAllWindows()`), so MCP-driven changes and cache-load progress reach
    Settings as well as the main window.
  - **Single Vite entry, route-param dispatch.** `main.tsx` mounts
    `<SettingsWindow />` when `?view=settings` is on the URL, otherwise
    `<App />`. Both windows share the preload, query client, and Zustand
    store.
  - **Sidebar layout.** Settings replaces the previous tab bar with a
    vertical sidebar listing six sections — General, Set Collection, Roles,
    Integrations, Data, Cache — and an active-section switch on the right.
    Each section is its own `*Pane` component under
    `src/components/settings/`. The active section is persisted to
    `settings-window-state.json` and restored on next open via a
    `?section=…` URL param.
  - **Window size.** Default bumped from 900×700 to 1000×700 with a min of
    800×600 to give the right pane room next to the 220px sidebar.

  Renderer cleanup along with the move:

  - Drop `'settings'` from the `AppView` discriminated union; remove the
    inline `<SettingsPage />` branch in `App.tsx`.
  - Sidebar gear icon now calls `window.electronAPI.openSettings()` instead
    of `setView('settings')`.
  - `SettingsPage` drops its in-content back button and "Settings" h1 — the
    native titlebar replaces them.

- ef8fd5f: Add a theme system with six built-in themes grouped by light/dark mode.

  Light: **Library** (default), **Fantasy**, **Steampunk**, **Ukiyo-e**.
  Dark: **Cyberpunk**, **Gothic**.

  Each theme ships its own shadcn token palette, WUBRG + multicolor + colorless
  mana-identity colors (exposed as `--color-w/u/b/r/g/m/c` CSS variables), and
  typography stack. Themes are applied as classes on `<html>` (e.g. `theme-library`)
  so token switching is a single DOM write.

  The Settings page gains an **Appearance** section with a light/dark mode pill
  toggle and a card grid that previews each theme's palette strip, name, and
  tagline.

  All eleven theme fonts (Cinzel, Fraunces, EB Garamond, Playfair Display,
  Space Grotesk, JetBrains Mono, Inter, Cormorant Garamond, Instrument Serif,
  IBM Plex Serif, IBM Plex Mono) are packaged locally via `@fontsource` /
  `@fontsource-variable`, so the app renders correctly on systems without the
  fonts installed and works fully offline.

  ### Config migration

  `Config.theme` widens from `'light' | 'dark'` to a `ThemeId` union. A
  `normalizeTheme()` pass in storage maps legacy values on read
  (`'light'` → `'library'`, `'dark'` → `'gothic'`) and defaults unknown
  values to `'library'`. Existing saved configs upgrade transparently on next
  load; no user action required.

  The storage default for `theme` also changes from `'dark'` to `'library'`
  for new installs.

### Patch Changes

- 4dfe10b: Dependency maintenance.

  Production dependencies (electron-app):

  - `lucide-react` 0.294.0 → 1.12.0
  - `@tanstack/react-query` 5.99.0 → 5.100.6
  - `react-router-dom` 7.14.1 → 7.14.2
  - `cmdk` 0.2.1 → 1.1.1
  - `zustand` 4.5.7 → 5.0.12 (major)
  - `uuid` 9.0.1 → 14.0.0 (major; also bumped in shared)

  The `zustand` and `uuid` major bumps did not surface breaking changes in
  this codebase (typecheck and existing usage continue to work), but both
  introduced upstream breaking changes worth noting if usage broadens.

  Toolchain (TypeScript 6.0): bumped TypeScript 5.9.3 → 6.0.3 across all
  packages and adjusted configs to match TS 6 stricter defaults — added
  `"types": ["node"]` to the base tsconfig (TS 6 no longer auto-discovers
  hoisted `@types/node` from a parent directory), removed the deprecated
  `baseUrl` from the electron-app tsconfig, and switched the variable
  font side-effect imports to explicit `.css` paths to satisfy TS6's new
  TS2882 check.

- 30d8c3a: Electron 42.

  Bumps Electron from 41.3.0 → 42.x (#174 brought 42.1.0; subsequent dev-dependency-group bumps tracked 42.2.0). Electron is the desktop runtime shipped with the app, so this is a major-version change to the production runtime: a new Chromium baseline, a new V8 / Node bundled inside, and the matching electron-builder framework metadata.

  No code changes were required at our level — the existing main-process, renderer, and IPC surface continued to typecheck and run unchanged across the upgrade — but downstream users should be aware that a fresh install of the app pulls in a different Chromium engine, with the usual implications (TLS / cipher list, CSS feature support, web-platform APIs, and OS minimum requirements track Electron's release notes).

- ac378c9: Extract `createCardIdentifier` to shared and replace inline reconstructions

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

- 692a2bc: Fix flickering price column and loading spinner on the Buy List view.

  `useBuyList` rebuilt its return array on every render, so its consumers
  saw a fresh reference each time. `BuyListView` had `useEffect(..., [buyList])`
  fetching prices, which formed a self-sustaining loop: render → new array
  reference → effect → fetch → `setPrices` → render → new array reference →
  fetch again. The flicker was the loading spinner toggling on and off as
  the loop ran.

  Memoized `useBuyList` on `decks` so the returned array is referentially
  stable when the underlying decks haven't changed.

- ac378c9: Fix two critical deck-modification bugs.

  ### Cards added through the Add Card modal silently disappeared

  The Mainboard radio in `CardAddModal` had `value="cards"` while the
  destination state was initialized to `CARD_SET.MAINBOARD` (`"mainboard"`).
  The mismatch left no radio visually selected when the modal opened —
  prompting users to click the apparently-empty Mainboard option, which
  flipped the destination to `"cards"`. The card was then routed to a
  phantom set named `"cards"` (created on demand by `withDeckCardSet`)
  that no UI tab displayed, so the add appeared to silently fail.

  Fixed by binding all three radio values to the `CARD_SET` constants
  (`MAINBOARD` / `SIDEBOARD` / `ALTERNATES`). Existing decks with phantom
  `"cards"` sets are not migrated — those sets stay in the JSON but remain
  invisible. They can be cleaned up later if any are found.

  ### No way to set a commander in the UI

  `SelectCommanderModal` was fully implemented but imported nowhere — the
  deck-detail header only displayed a commander when one was already set
  (via import or hand-edited JSON), with no affordance to set or change
  one. Users creating a fresh commander deck through the New Deck flow
  had no path to attach a commander.

  Fixed by wiring `SelectCommanderModal` into `DeckDetail`'s header for
  commander-like formats:

  - When `commanders.length === 0`: a **Set Commander** button opens the
    modal.
  - When a commander exists: a small pencil button next to the commander
    name opens the modal in swap mode, constrained to the current color
    identity so the swap can't silently invalidate existing cards.
  - When the existing commander has the **Partner** keyword and there's
    only one commander set, an additional **+ Partner** button opens the
    modal in Partner-add mode — Scryfall search restricts to
    `kw:partner`, identity filtering is bypassed (Partners union, not
    intersect), and the selected card is appended via the domain's
    `addCommander` (which recomputes the deck's color identity as the
    union of both commanders).

  Locked partnerships ("Partner with X"), Backgrounds, Doctor's
  Companion, and Friends Forever are not yet handled — those will land
  as follow-ups. The Scryfall card type now declares an optional
  `keywords?: string[]` field used for the Partner detection.

  Setting or swapping a commander now also resets the deck's color
  identity to match. The renderer's inline `CardIdentifier` construction
  in the commander wire-up was previously dropping the
  `colorIdentity` (and `flavorName`) fields, so even when `addCommander`
  ran on the domain side it computed an empty union. The fix carries
  both fields through; the slice's `setCommanders` was also tightened
  to recompute `deck.colorIdentity` via `deriveColorIdentity`, mirroring
  what `addCommander` and `removeCommander` already do.

- 21726d3: Fix Sideboard/Alternates/Cut tab counts to sum card quantities instead of row count. Previously a sideboard of 5 rows × 3 copies showed "(5)" instead of the correct "(15)". Introduces a new shared helper `getEntriesTotalQuantity` for summing `quantity` across a `CardEntry[]`.
- 2963e64: Fix the mana curve being nearly invisible (dark themes especially), and clean up the same anti-pattern in the consistency heatmap. Both components were wrapping our hex CSS variables in `hsl(...)` (legacy shadcn convention not used in this project per `feedback_css_color_tokens.md`), producing invalid CSS that effectively made bar fills, tooltip backgrounds, and heatmap-cell text transparent. The pie chart's hardcoded Tailwind palette also fell off-theme on Cyberpunk / Gothic. Now uses theme tokens directly throughout: bar fill in `var(--foreground)`, axis ticks in `var(--muted-foreground)`, pie fills in `var(--color-w/u/b/r/g/c)` with `var(--foreground)` strokes so slices remain separable on any background, and heatmap cell text in `var(--foreground)` where the data-driven background contrast allows.
- 2963e64: Fix reversible-layout cards (e.g. Secret Lair "Mountain // Mountain") being categorized as "Other" instead of their actual type. Scryfall returns `type_line: null` at the top level for these cards and puts each face's type on `card_faces[]`; `getTypeLine` and migration 006 now fall back to the first face's type line.
- f506fcd: Fix `search_cards` failing on ambiguous card names. Scryfall's fuzzy
  `/cards/named` endpoint returns 404 for both "no match" and "ambiguous
  match" (e.g. "Sephiroth" matches multiple Final Fantasy printings), so
  the tool was reporting these as `Card not found`. When fuzzy lookup
  returns nothing, the handler now falls back to a `name:"<query>"`
  substring search and returns the candidates with a "Multiple cards
  match…" header so Claude can disambiguate. Genuine misses still surface
  as `Card not found`. Exact (`exact: true`) lookups are unchanged.
- fcc9f19: Renamed the six built-in themes to MTG-flavored display names:

  | Old name  | New name     |
  | --------- | ------------ |
  | Library   | Strixhaven   |
  | Fantasy   | Dominaria    |
  | Steampunk | Kaladesh     |
  | Ukiyo-e   | Kamigawa     |
  | Cyberpunk | Neo Kamigawa |
  | Gothic    | Innistrad    |

  Display names only — internal theme IDs (`'library'`, `'fantasy'`, etc.),
  CSS class names (`.theme-library`), and stored config values are unchanged,
  so existing user configs continue to work without migration.

- fbd7ac1: Replace the deck-tile trash icon with a `⋮` dropdown menu housing **Delete deck** and (where applicable) the face-toggle action that previously lived in its own hover button. Lays the ground for additional per-deck actions in follow-ups.
- Updated dependencies [dd5ce17]
- Updated dependencies [27d3ba2]
- Updated dependencies [2963e64]
- Updated dependencies [2963e64]
- Updated dependencies [de3589d]
- Updated dependencies [9c06574]
- Updated dependencies [21150c3]
- Updated dependencies [4dfe10b]
- Updated dependencies [30d8c3a]
- Updated dependencies [ac378c9]
- Updated dependencies [692a2bc]
- Updated dependencies [ac378c9]
- Updated dependencies [21726d3]
- Updated dependencies [7601e0f]
- Updated dependencies [83274b0]
- Updated dependencies [30d8c3a]
- Updated dependencies [2963e64]
- Updated dependencies [de3589d]
- Updated dependencies [2963e64]
- Updated dependencies [f506fcd]
- Updated dependencies [a63b2fa]
- Updated dependencies [fcc9f19]
- Updated dependencies [ef8fd5f]
  - @mtg-deckbuilder/shared@0.12.0

## 0.11.0

### Minor Changes

- 073c822: Add game-format support for Pauper, Legacy, and Pioneer.

  Refactors card-intrinsic deck limits (Seven Dwarves, Nazgûl, Relentless Rats, etc.)
  out of each `DeckFormat` into a module-level in-memory map loaded on boot from
  Scryfall's `o:"A deck can have"` query. Disk-cached for 24h with an offline
  fallback, so validation works even before the first successful network fetch.

  Migration 005 strips the now-unused `unlimitedCards` and `specialLimitCards`
  fields from saved deck files on next load.

  Also fixes three latent bugs surfaced during the refactor:

  - `manage_deck update` now honors the `format` field (previously silently dropped).
  - `manage_commander` uses the new `isCommanderLikeFormat` helper so future
    commander-zone formats route correctly without a second edit.
  - The deck list in the Electron app now scrolls when its content overflows.

### Patch Changes

- 07c431b: Dependency maintenance batch covering the dependabot merges from
  2026-04-14 and 2026-04-15:

  - **Tailwind CSS 3.4 → 4.2.** The v4 PostCSS plugin moved to a separate
    package, breaking a fresh install. Switched the electron-app to the
    official `@tailwindcss/vite` plugin and dropped `autoprefixer` and
    `postcss` (v4 handles vendor prefixing internally via Lightning CSS).
    The existing `tailwind.config.js` is still loaded via an `@config`
    directive in `globals.css`, so shadcn/ui theme variables, Radix
    keyframes, and the custom border-radius scale carry over unchanged.
    Removed a v3-era `body { @apply dark; }` rule that v4 rejects — `dark`
    is a variant, not a utility, so this line was a silent no-op under v3.
  - **Electron 39 → 41 (major).** Desktop runtime upgrade; no app code
    changes required. Ships with newer Chromium and Node.js.
  - **Vite 6 → 8 (major).** Bundler upgrade; integrates cleanly with the
    new `@tailwindcss/vite` plugin. Build output now uses rolldown
    internals, which is why the CSS bundle size shifted.
  - **react-router-dom 7.14.0 → 7.14.1** (patch, prod-dependencies group).

- Updated dependencies [073c822]
- Updated dependencies [07c431b]
  - @mtg-deckbuilder/shared@0.11.0

## 0.10.4

### Patch Changes

- e59f7be: Fix release workflow to upload all platform artifacts in a single release job
- Updated dependencies [e59f7be]
  - @mtg-deckbuilder/shared@0.10.4

## 0.10.3

### Patch Changes

- bd96c8a: Downgrade pnpm to 10.32.1 to fix lockfile corruption and add build validation to CI
- Updated dependencies [bd96c8a]
  - @mtg-deckbuilder/shared@0.10.3

## 0.10.2

### Patch Changes

- 8c5aa3a: Fix lockfile corruption from pnpm manage-package-manager-versions and add build validation to CI
- Updated dependencies [8c5aa3a]
  - @mtg-deckbuilder/shared@0.10.2

## 0.10.1

### Patch Changes

- 201e590: Fix corrupted pnpm-lock.yaml and add build validation to CI
- Updated dependencies [201e590]
  - @mtg-deckbuilder/shared@0.10.1

## 0.10.0

### Minor Changes

- 87d9d0b: Add identify mode to pull list for marking specific printings of cards. Includes searchable printing combobox, per-card printing badges with remove, and card preview on hover. Fix react-dom version mismatch (18 vs 19).

### Patch Changes

- @mtg-deckbuilder/shared@0.10.0

## 0.9.2

### Patch Changes

- e4765d0: Bump CI Node.js to 22 for pnpm 10.33 compatibility. The 0.9.1 release did not produce binaries because the build workflows were pinned to Node 20 while pnpm 10.33 requires Node 22.13+ (it imports `node:sqlite`, which was added in Node 22.5).
- Updated dependencies [e4765d0]
  - @mtg-deckbuilder/shared@0.9.2

## 0.9.1

### Patch Changes

- 65c84f2: Upgrade runtime dependencies pulled in by Dependabot since the last release:

  - `react` 18.2 → 19.2.5 (electron-app)
  - `react-router-dom` 6.30 → 7.14 (electron-app)
  - `recharts` 2.15 → 3.8 (electron-app); fixes ManaCurve pie label to handle the new `percent: number | undefined` type
  - `tailwind-merge` 2.6 → 3.5 (electron-app)
  - `@tanstack/react-query` → 5.97 (electron-app)
  - `@modelcontextprotocol/sdk` → 1.29 (mcp-server)

- Updated dependencies [65c84f2]
  - @mtg-deckbuilder/shared@0.9.1

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

### Patch Changes

- Updated dependencies [aa0789f]
- Updated dependencies [8130b41]
- Updated dependencies [8130b41]
  - @mtg-deckbuilder/shared@0.9.0

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
- 8184566: Add cross-platform build support for macOS (x64 + arm64), Windows (x64), and Linux (x64 + arm64)
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

- 3d33f2f: Update app icon and fix application menu name

  - Replace app icon with new design featuring card with rainbow edge glow and AI sparkle trail
  - Fix application menu showing package name instead of "MTG Deckbuilder" in About/Hide/Quit items

- a93877b: Fix pull list and card merge bugs

  - Fix commander pull not reflecting in UI by removing over-restrictive printing filter
  - Fix pull list hiding "considering" cards by aligning filter with main deck list (exclude only "cut")
  - Remove collection level rarity filtering from pull list (collection level is advisory, not a hard gate)
  - Fix card merge not upgrading inclusion status when re-adding an existing card

- Updated dependencies [0201fce]
- Updated dependencies [d18c9bd]
- Updated dependencies [a07d20c]
- Updated dependencies [7aa43ab]
- Updated dependencies [5a5c779]
- Updated dependencies [a93877b]
- Updated dependencies [0df4c87]
- Updated dependencies [01183fc]
  - @mtg-deckbuilder/shared@0.8.0

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
