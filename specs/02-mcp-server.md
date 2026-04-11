# MCP Server Tool Reference

This document describes every MCP tool exposed by `@mtg-deckbuilder/mcp-server`. The server is built on `@modelcontextprotocol/sdk` and is designed to be consumed by Claude Desktop (or any MCP client) for AI-assisted deck building.

The single source of truth for tool schemas is `packages/mcp-server/src/tools/schemas.ts`. The single source of truth for handlers is `packages/mcp-server/src/tools/`. This document is hand-maintained reference material — when the schemas change, update this file.

---

## Conventions

- All tools take a single object argument; all arguments are JSON values.
- "Required" means the argument must be present in the input.
- Card "list" names are: `mainboard`, `sideboard`, `alternates`, `cut`. The `cut` set holds removed cards (with optional notes explaining why) and is excluded from deck-size validation, color identity, and pull lists.
- The `manage_card` tool's `move` action requires explicit `quantity` when the source entry has more than 1 copy. This prevents the agent from accidentally moving an entire stack when it meant a single card.

---

## Deck management

### `list_decks`

Returns summary info for every saved deck.

**Input:** none.

### `get_deck`

Returns the raw deck JSON (with Scryfall IDs, metadata, and a structural validation report). Use this for programmatic operations or exports. For human-readable deck analysis, use `view_deck` instead.

**Input:**
- `identifier` *(string, required)* — deck UUID or name (case-insensitive).
- `detail` *(string, optional)* — `summary` (default) | `full`. Summary mode strips per-entry `id`, `addedAt`, `source`, and `pulledPrintings` from each `CardEntry` — these are only needed for surgical edit operations or collection-pull tracking. Full mode preserves every field.

### `manage_deck`

Create, update, or delete a deck.

**Input:**
- `action` *(string, required)* — `create` | `update` | `delete`.
- `deck_id` *(string)* — required for `update` and `delete`.
- `name` *(string)* — required for `create`.
- `format` *(string)* — `commander` | `standard` | `modern` | `kitchen_table`. Required for `create`.
- `archetype` *(string, optional)*.
- `description` *(string, optional)*.

---

## Card management

### `manage_card`

Add, remove, update, or move cards in a deck. This is the workhorse tool for card-level operations.

**Input:**
- `action` *(string, required)* — `add` | `remove` | `update` | `move`.
- `deck_id` *(string, required)*.
- `cards` *(string[])* — batch of cards. For `add`, each entry is `[Nx ]<set_code> <collector_number>` (e.g. `"fdn 542"`, `"2x woe 138"`). For `remove`/`update`/`move`, each entry is a card name.
- `name`, `set_code`, `collector_number`, `quantity` — single-card variants of `cards`. The `name`/`set_code`/`collector_number` parameters are deprecated; prefer the `cards` array with `Nx` prefixes.

**Action-specific parameters:**

- **`add`** — `cards` (or `name` + `set_code` + `collector_number`), `roles`, `ownership`, `to_sideboard`, `to_alternates`, `force`. New entries default to `quantity: 1`, `ownership: 'unknown'`, `roles: []`, `source: 'user'`. When `name`, `set_code`, and `collector_number` are all supplied, the resolved printing's name is cross-checked against the supplied `name` — a mismatch errors out. Pass `force: true` to override. The `cards` array path never triggers this check (each array entry is parsed as `set_code collector_number`, so there is no user-supplied name to validate).
- **`remove`** — `cards`, `quantity` (number to remove; defaults to all), `from_sideboard`, `from_alternates`.
- **`update`** — `cards`, `roles` (replaces all), `add_roles`, `remove_roles`, `ownership`, `notes`.
- **`move`** — `cards`, `from` *(required)*, `to` *(required)*, `quantity` *(required when source has >1 copies)*. Both `from` and `to` accept `mainboard`, `sideboard`, `alternates`, and `cut`. Use `to: "cut"` to remove a card while preserving notes about why it was cut.

**`quantity` semantics across actions:**
- `add`: number of copies to add (defaults to 1, unless an `Nx` prefix is used in `cards`).
- `remove`: number of copies to remove (defaults to all).
- `move`: number of copies to move. **Required** when the source entry has more than one copy. Defaults to "the full stack" only when the source is a singleton — this prevents accidental bulk moves.

**`ownership` enum:** `unknown` | `owned` | `need_to_buy`.

**Note:** The `inclusion` field (formerly `confirmed` | `considering` | `cut`) was removed in the card-set refactor. Cards being considered live in the `alternates` set; cut cards live in the `cut` set. There is no per-card status flag.

### `search_decks_for_card`

Find which decks contain a specific card.

**Input:**
- `card_name` *(string, required)*.

---

## Card search

### `search_cards`

Search for cards on Scryfall. Accepts a card name (fuzzy or exact), a Scryfall UUID, or a full Scryfall search query (e.g. `"c:blue t:instant cmc<=2"`). The query type is auto-detected.

**Input:**
- `query` *(string, required)* — card name, Scryfall UUID, or Scryfall search query.
- `exact` *(boolean)* — use exact name matching instead of fuzzy.
- `limit` *(number)* — max results for search queries (default 10).
- `set_code`, `collector_number` *(string)* — narrow to a specific printing.
- `format` *(string)* — `compact` (default, human-readable) | `json`.

### `get_collection_filter`

Generate a Scryfall filter string based on the user's set collection. The filter narrows search results to cards the user likely owns, including appropriate rarity filters per set's configured collection level. Combine with `search_cards` to constrain a search to the user's collection.

**Input:** none.

---

## Views

Deck rendering is split across four per-view tools rather than one multiplexed `view_deck`. **Start with `deck_list` for any deck-analysis task** — it returns the full card list with oracle text by default.

### `deck_list`

**Primary deck-analysis view.** Returns the deck's card list as markdown, with oracle text on every card by default. Renders separate sections for `## Commander(s)`, `## Main Deck`, `## Alternates`, and `## Sideboard`.

**Input:**
- `deck_id` *(string, required)*.
- `detail` *(string)* — `summary` | `compact` | `full`. **Defaults to `compact`** (includes oracle text — the first-look content for deck analysis). `summary` drops oracle text for a terser one-line-per-card form. `full` adds set code and rarity on top of compact.
- `sort_by` *(string)* — sort key within each section. Supported values: `name`, `set`.
- `group_by` *(string)* — group cards into sections. Supported values: `none` (default), `role`, `type`.
- `filters` *(array)* — optional card filters. Each filter has `type`, `mode`, and `values`.
  - `type`: `cmc` | `color` | `card-type` | `role` | `ownership`.
  - `mode`: `include` | `exclude`.
  - `values`: array of permitted values (depends on `type`).

### `deck_curve`

Mana curve analysis: CMC distribution, color pip counts, type breakdown, and card counts.

**Input:**
- `deck_id` *(string, required)*.
- `filters` *(array, optional)* — same shape as `deck_list.filters`. Limits the curve analysis to cards that match the filter set.

### `deck_notes`

Returns the deck's strategy notes — combos, synergies, themes, and game-plan commentary. Use when a user asks *how* a deck is meant to play. This view does not require Scryfall data and skips the per-card cache load.

**Input:**
- `deck_id` *(string, required)*.

### `deck_pull_list`

Cards grouped by set for physical collection pulling, with pulled-status checkboxes. Use when preparing to physically assemble a deck.

**Input:**
- `deck_id` *(string, required)*.

---

## Roles

### `list_roles`

List all available roles. Returns global roles always; if `deck_id` is provided, also returns deck-specific custom roles.

**Input:**
- `deck_id` *(string, optional)*.

### `manage_role`

Add, update, or delete role definitions. Distinguishes between **global** roles (available across all decks) and **custom** roles (deck-specific).

**Input:**
- `action` *(string, required)* — `add_custom` | `update_custom` | `delete_custom` | `add_global` | `update_global` | `delete_global`.
- `deck_id` *(string)* — required for `add_custom`, `update_custom`, `delete_custom`.
- `id` *(string, required)* — role ID.
- `name` *(string)* — display name. Required for `add_custom` and `add_global`.
- `description` *(string, optional)*.
- `color` *(string, optional)* — hex color code (e.g. `#22c55e`).

---

## Commanders

### `manage_commander`

Add, remove, or swap commanders for a Commander format deck. The deck's `colorIdentity` is automatically derived from the union of commander color identities.

**Input:**
- `action` *(string, required)* — `add` | `remove` | `swap`.
- `deck_id` *(string, required)*.
- `commander_name` *(string, required)* — the commander to add, remove, or replace.
- `set_code`, `collector_number` *(string)* — for `add`/`remove`, the specific printing.
- `new_commander_name` *(string)* — required for `swap`. The replacement commander.
- `new_set_code`, `new_collector_number` *(string)* — for `swap`, the replacement printing.
- `force` *(boolean, optional)* — when all three of `commander_name`, `set_code`, and `collector_number` are supplied, the resolved printing's name is cross-checked against `commander_name` (matches against canonical name, flavor name, or any face name). On mismatch the call errors. Pass `force: true` to override. Same behavior for the `swap` action against `new_commander_name` + `new_set_code` + `new_collector_number`.

---

## Interest list

The interest list is a single global `CardList` (UUID `00000000-0000-4000-8000-000000000001`) where the user collects cards they're considering for future decks.

### `get_interest_list`

Returns the full interest list.

**Input:** none.

### `manage_interest_list`

Add or remove cards from the interest list.

**Input:**
- `action` *(string, required)* — `add` | `remove`.
- `name` *(string)* — required for `add`.
- `card_name` *(string)* — required for `remove`.
- `set_code`, `collector_number` *(string, optional)* — narrows to a specific printing on `add`.
- `notes` *(string, optional)* — free-text notes attached to the entry.
- `potential_decks` *(string[])* — deck IDs the user is considering this card for.
- `source` *(string, optional)* — `user` | `import` | `claude`. Defaults to `user`.
- `force` *(boolean, optional)* — when `name`, `set_code`, and `collector_number` are all supplied on `add`, the resolved printing's name is cross-checked against the supplied `name` (matches against canonical name, flavor name, or any face name). On mismatch the call errors. Pass `force: true` to override — useful for deliberately adding a card by a flavor/face name the validation doesn't recognize.

---

## Deck notes

### `list_deck_notes`

List all notes attached to a deck.

**Input:**
- `deck_id` *(string, required)*.

### `manage_deck_note`

Add, update, or delete a deck note. Notes can optionally be associated with one or more cards and a role; updating or deleting a note can propagate role changes to the associated cards.

**Input:**
- `action` *(string, required)* — `add` | `update` | `delete`.
- `deck_id` *(string, required)*.
- `note_id` *(string)* — required for `update` and `delete`.
- `title` *(string)*.
- `content` *(string)* — Markdown body.
- `note_type` *(string)* — `combo` | `synergy` | `theme` | `strategy` | `general`.
- `card_names` *(string[])* — card names ordered by relevance.
- `role_id` *(string, optional)* — role to propagate to associated cards.
- `remove_role` *(boolean)* — for `update`/`delete`, also remove the propagated role from associated cards.

---

## Refactor history (for context)

This document reflects the post-refactor MCP tool surface as of the `list-refactor` branch's CardEntry cleanup. Notable changes from earlier versions of the tools:

- **`inclusion` is gone.** The per-card `confirmed` | `considering` | `cut` field was replaced by `CardSet` membership. The `manage_card.move` action now accepts `cut` as a destination set (and source). The `status` argument was removed from `add` and `update`.
- **`isPinned` is gone.** It was a vestigial display flag that never had a UI consumer.
- **`typeLine` is no longer denormalized on entries.** Type information is read from the Scryfall cache via the `getTypeLine(entry, cache)` accessor in shared. The `search_cards` tool still returns `typeLine` in its response (as Scryfall card data), but `CardEntry` no longer carries it.
- **`quantity`, `roles`, `ownership`, and `source` are now required on every `CardEntry`.** Defaults are applied at the factory layer (`makeCardEntry` in shared) rather than scattered across reader sites.
- **`manage_card.move` enforces explicit `quantity` for multi-copy sources.** This is the bug-fix that motivated the refactor: agents could previously cut all 15 Islands when meaning to cut 1.
- **`view_deck` was split into `deck_list`, `deck_curve`, `deck_notes`, and `deck_pull_list`.** Each view is now a dedicated tool with only the parameters it actually uses. `deck_list` defaults `detail` to `compact` so that oracle text is included on the first call — previously, reaching oracle text required `view: "full", detail: "compact"`, which LLMs often missed.

The on-disk migration history is in `packages/shared/src/migrations/`:
- `001-migrate-notes` — note format upgrade.
- `002-card-sets` — converts legacy `cards`/`sideboard`/`alternates` arrays into the unified `cardSets: CardSet[]` shape.
- `003-card-entry-cleanup` — backfills `roles`/`source`/`quantity`/`ownership` defaults, strips `isPinned`, converts `inclusion` to set membership.
- `004-strip-typeline` — strips the denormalized `typeLine` field from every entry.
