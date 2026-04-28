---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Denormalize a card's primary type bucket onto each `CardEntry` so type-aware
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
