# MCP Server Tool Reference

This document describes every MCP tool exposed by `@mtg-deckbuilder/mcp-server`. The server is built on `@modelcontextprotocol/sdk` and is designed to be consumed by Claude Desktop (or any MCP client) for AI-assisted deck building.

The single source of truth for tool schemas is `packages/mcp-server/src/tools/schemas.ts`. The single source of truth for handlers is `packages/mcp-server/src/tools/`. This document is hand-maintained reference material — when the schemas change, update this file.

---

## Server instructions

On `initialize`, the server returns an `instructions` string that MCP clients inject into the model's context for the whole session. It is built by `buildInstructions` in `packages/mcp-server/src/instructions.ts` and has three parts:

1. **Skill loading.** Before any deck, list, or card-search task, the model should load the matching mtg-deckbuilder skill *if it appears in its available skills*. When the server was started with `--skills-dir` and finds skills there, the sentence also names each bundled skill and points at `list_bundled_skills`.
2. **Install nudge.** If a skill is missing, the model must not invoke or wait for it. It mentions once that skills ship with the MTG Deckbuilder app (Settings → Skills), then proceeds with the tools.
3. **Tool guidance.** Card-set names (`deck_export` calls `alternates` "maybeboard") and "start deck-analysis tasks with `deck_list`."

Every skill sentence is conditional: skills are installed by the Electron app, so a standalone server user may not have them, and the tools must work on their own. Whether a client actually surfaces `instructions` to the model varies by client.

**Subagents.** Subagents receive tool schemas but not `instructions`, so every tool description (except `list_bundled_skills`) also starts with one conditional sentence naming its matching skill, e.g. "If the `mtg-deckbuilder-analysis` skill is in your available skills, load it before using this tool; otherwise proceed." The tool→skill map lives in `packages/mcp-server/src/tools/skill-pointers.ts` and is applied in `getToolDefinitions`. The pointer appears regardless of `--skills-dir`, since it is conditional on the client's skills, not the server's.

The server also reports its `package.json` version in the `initialize` response.

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

Returns the raw deck JSON (with Scryfall IDs, metadata, and a structural validation report). Use this for programmatic operations or exports. For human-readable deck analysis, use `deck_list` instead.

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

Search for cards on Scryfall. Takes either `query` (a card name, fuzzy or exact; a Scryfall UUID; or a full Scryfall search query such as `"c:blue t:instant cmc<=2"`, auto-detected) or `names` (exact-name batch lookup). Exactly one of the two is required; passing neither or both is an error.

**Input:**
- `query` *(string)* — card name, Scryfall UUID, or Scryfall search query. At most 500 characters (the server's generic `query` input guard, `INPUT_LIMITS.query`); longer input fails with `'query' exceeds maximum length of 500 characters`. To look up many known cards, use `names` rather than an `!"…" or !"…"` chain.
- `names` *(string[])* — exact card names to look up in one call. 1–100 entries; each entry is trimmed, must be non-empty, and is subject to the 200-character `name` guard. Matching is case-insensitive, and repeated names (ignoring case) are collapsed to the first spelling.
- `exact` *(boolean)* — use exact name matching instead of fuzzy. `query` only; accepted but redundant with `names`, which is always exact.
- `limit` *(number)* — max results for search queries (default 10). `query` only; rejected with `names`.
- `set_code`, `collector_number` *(string)* — narrow to a specific printing. `query` only; rejected with `names`.
- `format` *(string)* — `compact` (default, human-readable) | `json`. Applies to both modes.

**`names` lookup:** each name is first resolved from the local card cache's name index; only the misses go to Scryfall, as `POST /cards/collection` requests of up to 75 names each, through the same request queue and 429/5xx retry as every other call (60 uncached names cost one request, 100 cost two). Cards fetched this way are cached with the name index, so a repeat call makes no request for them; names Scryfall had no card for are not remembered, so a repeat call asks again for those alone. Compact output is `Found N of M cards:` (M = distinct names), then each found card in input order in the usual compact card format, then `Not found: a, b` listing every name Scryfall has no card for; json output is `{ cards: [...], notFound: [...] }`. A miss never raises an error. A failed batch request does: it surfaces as the Scryfall error (e.g. `Rate limited by Scryfall; retry in Ns`), never as a list of misses, and nothing from that call is cached. Known limitation: the cache indexes a card by its full name, so a name that matches only one face of a multi-face card is looked up again on each call.

**Query detection:** a query is treated as Scryfall search syntax when it contains parentheses, any `word:` / `word<=` style operator (known or not), a `-` negation prefix on a token, `!"…"`, or is entirely one quoted phrase. Everything else is a card name. Malformed or unknown operators therefore reach Scryfall and return its own error rather than "Card not found".

**Errors and notes:** Scryfall answers both "nothing matched" and "malformed query" with the same 404, so a zero-result search stays a normal result but includes Scryfall's explanation (`Scryfall: …` in compact output, `notes` in json). Other Scryfall failures (400, 429, 5xx) are raised as tool errors carrying Scryfall's `details`. Warnings Scryfall attaches to a successful search (e.g. an ignored expression) are appended as `Warning: …` / `notes`.

**Rate limiting and caching:** all Scryfall requests in the process share one serialising queue spaced `SCRYFALL.MIN_REQUEST_INTERVAL_MS` (100 ms, ≤10 req/s) apart, so parallel calls are queued rather than burst. A 429 or transient 5xx (500/502/503/504) is retried with backoff (honouring `Retry-After`, up to 4 attempts, at most 10 s per wait); while a retry waits, the whole queue is held. If Scryfall is still rate limiting, or asks for a longer wait, the tool fails with `Rate limited by Scryfall; retry in Ns` — never `Card not found`. Other non-404 failures on name/id/set-collector lookups likewise surface as Scryfall errors. Name, id, and set+collector lookups go through the local card cache (`cache/scryfall/`), so a repeat lookup makes no network call. Cards shown from a syntax search (up to `limit`) are added to the cache, except that a name already cached keeps its existing printing.

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
  - `values`: array of permitted values (depends on `type`). Matching is case-insensitive: `card-type` is one of `Creature`, `Planeswalker`, `Battle`, `Artifact`, `Enchantment`, `Land`, `Instant`, `Sorcery`, `Other`; `color` is `W`/`U`/`B`/`R`/`G`/`C`; `ownership` is `unknown`/`owned`/`need_to_buy`; `cmc` is an integer 0-7 (7 means 7+; numeric strings are accepted); `role` is a role id. An unrecognised value is an error listing the valid values, never a silent empty result.

### `deck_curve`

Mana curve analysis: CMC distribution, color pip counts, type breakdown, and card counts.

**Input:**
- `deck_id` *(string, required)*.
- `filters` *(array, optional)* — same shape as `deck_list.filters`. Limits the curve analysis to cards that match the filter set.

**Card classification (shared by `deck_list`, `deck_curve`, `deck_pull_list` and the `card-type` filter).** Every view buckets a card through the same rule (`getEntryPrimaryType` / `isLandEntry` in `@mtg-deckbuilder/shared`), so `deck_list group_by=type`, the Type Distribution, and the `Lands:` count always agree:
- The entry's stored `primaryType` wins; otherwise the type is derived from the Scryfall cache; otherwise `Other`.
- Multi-face cards (transform, MDFC, adventure, split, omen) are classified by their **front face**: Treasure Map (`Artifact // Land`) is an Artifact, Balamb Garden (`Land // Artifact`) is a Land, Esper Origins (`Sorcery // Enchantment Creature`) is a Sorcery, and spell-front MDFCs such as Shatterskull Smashing count as spells, not lands.
- Within one face the priority is Creature, Planeswalker, Battle, Land, Instant, Sorcery, Artifact, Enchantment — so Dryad Arbor is a Creature and artifact/enchantment lands are Lands.
- A card is a land exactly when its primary type is `Land`; lands are excluded from the mana curve and pip counts.

**Mana cost (shared by `deck_list`, `deck_curve` pips, `deck_pull_list` and `search_cards`).** Every reader goes through `getCardManaCost` in `@mtg-deckbuilder/shared`:
- Two-image layouts (transform, modal DFC, reversible) have no top-level cost, so the **front face's** cost is used: Vincent Valentine // Galian Beast shows `{2}{B}{B}` and contributes two black pips.
- One-image multi-part layouts (split, adventure, flip) keep their top-level cost as Scryfall prints it, e.g. Fire // Ice shows `{1}{R} // {1}{U}` and its pips count both halves.

**Mana pips (`## Mana Pips`, shared by `deck_curve` and the Electron curve).** `tallyManaCosts` in `@mtg-deckbuilder/shared` parses every `{...}` symbol of each nonland card's cost (`parseManaCost`) and multiplies by quantity. Each symbol counts at most one pip per option, never fractions:
- `{W}` `{U}` `{B}` `{R}` `{G}` — one pip of that colour.
- `{C}` — one **Colorless** pip. Only real `{C}` symbols are colorless.
- `{N}` — generic mana. It is **not** a pip and is reported on its own `Generic` line (sum of all `{N}`), never folded into Colorless.
- Hybrid `{W/U}` (and `{C/W}`, hybrid Phyrexian `{W/U/P}`) — one pip toward **each** option, since either colour can pay it.
- Twobrid `{2/W}` — one pip of its colour; the `2` alternative is not counted as generic.
- Phyrexian `{G/P}` — one pip of its colour.
- `{X}`/`{Y}`/`{Z}`, snow `{S}` and anything else (half mana, etc.) — not counted.

Lands and cards without Scryfall data contribute nothing (see below). Colour lines with a zero count are omitted; the section is omitted when every count is zero.

```
## Mana Pips
- White: 20
- Green: 15
- Colorless: 2
- Generic: 62 _(total of {N} costs; not a pip)_
```

**Card counts (`## Card Counts`).** Lands and Nonlands always come from the same set of cards, and the printed lines always add up. Unfiltered, the commander(s) get their own line so `Lands + Nonlands + Commander(s) = Total`:

```
## Card Counts
- Lands: 36
- Nonlands: 63
- Commander: 1
- Total: 100/100
```

With `filters`, the heading says `(filtered)`, Lands + Nonlands = `Matching` (the filtered mainboard cards, commanders never included), and the whole-deck size is printed separately:

```
## Card Counts (filtered)
- Lands: 0
- Nonlands: 28
- Matching: 28 of 99 mainboard cards (commander not included)
- Deck total: 100/100
```

**Missing Scryfall data — "fetch, then warn" (shared by `deck_list`, `deck_curve` and `deck_pull_list`).** Card data comes from the Scryfall cache, but these views never silently treat a missing card as mana value 0 or type `Other`:
1. The tool handler (`loadCardData` in `packages/mcp-server/src/tools/card-data.ts`) reads the cache for every deck entry and finds the entries it lacks (`findUncachedEntries` in `@mtg-deckbuilder/shared`).
2. It fetches the missing cards by Scryfall id through the rate-limited batch `/cards/collection` lookup (`getCardsByIds`) and writes them to the cache (`cacheCardsWithIndex`), so later calls are fully cached. The fetch is bounded: at most 150 cards per call (two collection requests) and a 10-second timeout. A fetch that fails, throws or times out counts as "nothing resolved"; it never fails the tool call. A fully cached deck makes no network call. Entries without a `scryfallId` can't be fetched.
3. The pure view receives the cache plus the list of entries that are still unresolved. Each view warns only about the entries it renders. Unresolved cards keep their stored `primaryType`, so type groupings and land counts stay correct.

The warning is a blockquote placed directly below the view's heading block:

```
> **Warning:** 4 cards without Scryfall data (not cached and could not be fetched); their oracle text, mana value and mana pips are missing: Lightning Bolt, Opt.
```

The count is in copies. Up to 25 distinct names are listed, followed by `, and N more` when there are more. In addition:
- `deck_list` tags each unresolved card line with `[no Scryfall data]`.
- `deck_curve` leaves unresolved nonland cards out of the mana curve rows and pip counts (`getCmcDistribution` skips any nonland card without a mana value). It adds `_Of the cards without Scryfall data, N are nonland cards and are excluded from the curve and pips._` (singular: `1 is a nonland card and is excluded`) under the `## Mana Curve` rows. N counts only the nonland copies, so it can be smaller than the warning's count, which includes lands.

### `deck_notes`

Returns the deck's strategy notes — combos, synergies, themes, and game-plan commentary — as read-only markdown with role names resolved. Use when a user asks *how* a deck is meant to play. The output has no note ids or timestamps; use `list_deck_notes` when you need an id for `manage_deck_note`. This view does not require Scryfall data and skips the per-card cache load.

**Input:**
- `deck_id` *(string, required)*.

### `deck_export`

Exports a deck as text in one of the supported decklist formats (`moxfield`, `archidekt`, `simple`), suitable for pasting into the matching site. Returns `deckId`, `deckName`, `format`, `formatName`, `content`, and `lineCount` (0 when `content` is empty, e.g. an empty section).

**Input:**
- `deck_id` *(string, required)*.
- `format` *(string, required)* — target export format.
- `include_sideboard` *(boolean, default true)*.
- `include_maybeboard` *(boolean, default true)* — include the maybeboard section. `maybeboard` is the export name for the `alternates` set; `cut` is never exported.
- `section` *(`mainboard` | `sideboard` | `maybeboard`, optional)* — emit only the named section. Useful for Moxfield-style imports where each section pastes into a separate UI box. Omit to emit the full deck. `maybeboard` is the export name for the `alternates` set; `cut` is never exported.

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

## Card lists

A `CardList` is a generic named card collection. Each list has a `kind` —
`interest` | `collection` | `scan` | `wishlist` | `custom` — that drives default
descriptions and UI affordances. The well-known interest list (UUID
`00000000-0000-4000-8000-000000000001`) is reserved and cannot be deleted, but
otherwise behaves like any other list.

### `list_card_lists`

Returns a summary of all saved card lists: id, name, kind, description, card count, updatedAt.

**Input:** none.

### `get_card_list`

Returns a single card list with all entries.

**Input:**
- `identifier` *(string, required)* — UUID or case-insensitive name.

### `manage_card_list`

Create, rename, or delete a list, or add/remove cards within one.

**Input:**
- `action` *(string, required)* — `create` | `delete` | `rename` | `add` | `remove`.
- `id` *(string)* — required for everything except `create`.
- `name` *(string)* — for `create`/`rename`: list name. For `add`: card name.
- `description` *(string, optional)*.
- `kind` *(string, optional)* — `interest` | `collection` | `scan` | `wishlist` | `custom`. Used on `create`. Defaults to `custom`.
- `card_name` *(string)* — for `remove`, when `entry_id` is not given. Fails (removing nothing) if the name matches more than one entry; the error lists each candidate's id, printing, and whether it has notes or potential decks.
- `entry_id` *(string)* — for `remove`: the entry id (from `get_card_list`). Preferred over `card_name` when both are given. `set_code` + `collector_number` also narrow a `card_name` on `remove`.
- `set_code`, `collector_number` *(string, optional)* — narrow to a specific printing on `add`.
- `quantity` *(number, optional)* — quantity on `add`.
- `notes` *(string, optional)* — free-text notes on the entry.
- `potential_decks` *(string[])* — deck IDs the user is considering this card for.
- `source` *(string, optional)* — `user` | `import` | `claude`. Defaults to `user`.
- `force` *(boolean, optional)* — same name/set+collector mismatch override as `manage_card`.

The well-known interest-list id cannot be deleted; that action errors.

`remove` returns `{ success, removed }`, where `removed` is the deleted entry.

---

## Deck notes

### `list_deck_notes`

Returns a JSON array of every note attached to a deck: `id`, `title`, `noteType`, `cardRefs`, `roleId`, full `content`, `createdAt`, `updatedAt`. This is the only tool that returns note ids, which `manage_deck_note` `update`/`delete` require. It is not a titles-only index; for reading the strategy, `deck_notes` (markdown) is easier.

**Input:**
- `deck_id` *(string, required)*.

### `manage_deck_note`

Add, update, or delete a deck note. Notes can optionally be associated with one or more cards and a role; updating or deleting a note can propagate role changes to the associated cards.

**Input:**
- `action` *(string, required)* — `add` | `update` | `delete`.
- `deck_id` *(string, required)*.
- `note_id` *(string)* — required for `update` and `delete`. Obtain it from `list_deck_notes`; `deck_notes` does not return ids.
- `title` *(string)*.
- `content` *(string)* — Markdown body.
- `note_type` *(string)* — `combo` | `synergy` | `theme` | `strategy` | `general`.
- `card_names` *(string[])* — card names ordered by relevance.
- `role_id` *(string, optional)* — role to propagate to associated cards.
- `remove_role` *(boolean)* — for `update`/`delete`, also remove the propagated role from associated cards.

---

## Skills

### `list_bundled_skills`

Lists the SKILL.md skills bundled with the running app: each skill's `name`, `version` (a date), and `description`. Clients use it to check whether installed copies (in `~/.claude/skills`, `~/.gemini/skills`, Claude Desktop's Capabilities, etc.) are current by comparing `version` against the local SKILL.md's `metadata.version`.

The Electron app passes `--skills-dir <path>` when it spawns the server. Without that flag, or if the directory is missing, the tool returns `skills_dir_configured: false` with an empty list, so callers can tell "no skills directory" apart from "no skills."

**Input:** none.

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
