---
name: mtg-deckbuilder-analysis
description: Inspect and analyze decks stored in the mtg-deckbuilder MCP server — viewing card lists with oracle text, computing mana curves, reading strategic notes, generating physical pull lists, and searching for cards across decks. Use when a user asks "show me the deck", "what's in this deck", "what's the mana curve", "what's the strategy", or "which decks contain card X".
metadata:
  version: "2026-05-31"
---

# MTG Deckbuilder — Analysis & Views

How to inspect a deck and answer questions about its contents, mana base, strategy, and cross-deck card usage.

## Tool index

| Tool | Purpose |
|------|---------|
| `deck_list` | **Primary deck-analysis view.** Markdown list of every card with oracle text. The right tool for "show me the deck". |
| `deck_curve` | Mana curve breakdown — CMC distribution, color pip counts, type counts. Separate tool from `deck_list`. |
| `deck_notes` | Read strategic notes (combos, synergies, themes) attached to a deck. Read-only — to add/edit notes, use `manage_deck_note`. |
| `deck_pull_list` | Physical-assembly view: cards grouped by set with checkboxes for pull tracking. |
| `get_deck` | **Raw deck JSON.** Programmatic / surgical-edit use only. *Do not use for human-readable views — that's `deck_list`.* |
| `search_decks_for_card` | Find which decks contain a given card by name (checks commander zone too). |
| `list_deck_notes` | List every note attached to a deck. |
| `manage_deck_note` | Add, update, or delete a deck note. |

## "Show me the deck" → `deck_list`

This is the single most important pattern in this skill. When a user says any of the following:

- "show me my deck"
- "what's in the [name] deck"
- "list the cards"
- "let's look at the deck"

…the answer is **`deck_list`**, not `get_deck`. `deck_list` returns formatted markdown with oracle text on every card. `get_deck` returns raw JSON suitable for programmatic editing — not for reading.

### `deck_list` detail levels

| `detail` | What you get | When to use |
|----------|--------------|-------------|
| `compact` (default) | Card lines including oracle text | **Default** — almost always what you want for "show me the deck" |
| `summary` | Just names + quantities | When you need a quick rundown without text bloat |
| `full` | Names + oracle text + set code + rarity | Collector / printing-focused review |

### `deck_list` grouping and sorting

- `group_by`: `none` (default), `role`, `type`. Use `role` to see whether the deck has enough removal/ramp/draw; use `type` for an at-a-glance creature/spell/land breakdown.
- `sort_by`: `name`, `set`. Defaults to name within sections.

### `deck_list` filtering

Same filter schema as `deck_curve` (see "Filter schema" below). Examples:

- Only creatures: `filters: [{type: "card-type", mode: "include", values: ["Creature"]}]`
- Drop lands: `filters: [{type: "card-type", mode: "exclude", values: ["Land"]}]`
- Cards I still need to buy: `filters: [{type: "ownership", mode: "include", values: ["need_to_buy"]}]`
- Cards in a specific role: `filters: [{type: "role", mode: "include", values: ["ramp"]}]`

## Delegating deck evaluation

If your client supports subagents (a delegation / task tool), a *judgment* question about a deck
is a good candidate to hand off. `deck_list` at `compact`/`full` detail is the largest payload in
this toolset — every card with its oracle text — and an evaluation also pulls `deck_curve` and
`deck_notes` on top. That's a lot of context to answer a question whose output is a paragraph.

**Carve-out first — do not delegate the render.** When the user says "show me the deck", "list the
cards", or "what's in it", that `deck_list` markdown is *meant for them to read*. Run it in the
main conversation and show it. Summarizing it through a subagent defeats the purpose and loses the
oracle text the user asked to see.

**When to delegate.** Reach for a subagent on *evaluative* questions where the inputs are large
but the answer is prose: "is this deck balanced?", "does it have enough removal?", "what's the
game plan?", "where is the curve too top-heavy?"

**Brief the subagent with** the `deck_id` and the question. It runs whatever it needs —
`deck_curve`, `deck_notes`, and a filtered or `group_by: role` `deck_list` — and reasons about the
curve, role distribution, and strategy.

**Ask it to return** a tight written assessment (a few paragraphs, maybe a short list of gaps) —
**not** the raw card list. Read-only: it analyzes and reports; any notes worth persisting are added
by the main agent via `manage_deck_note`.

## `deck_list` vs `get_deck` — when to use which

| Situation | Tool |
|-----------|------|
| Human asking what's in the deck | `deck_list` |
| Generating an export, sharing summary | `deck_list` (or `deck_export` from the decks skill) |
| Need to know the underlying entry IDs to edit specific cards | `get_deck` with `detail: full` |
| Programmatically computing something the views don't surface | `get_deck` with `detail: summary` |

`get_deck`'s `detail` parameter is different from `deck_list`'s:
- `get_deck.detail = summary`: strips per-entry audit fields (`id`, `addedAt`, `source`, `pulledPrintings`) — good for analysis
- `get_deck.detail = full`: every field including audit — needed only when you'll be passing IDs back in subsequent calls

## Mana curve → `deck_curve` (separate tool)

`deck_curve` is **its own tool**, not a `deck_list` option. Calling `deck_list` with hopes of getting a curve back will not work.

Returns:
- **CMC distribution**: counts per mana value (0 through 7+).
- **Color pip counts**: how many of each WUBRG pip appears across all costs in the deck (informs mana base balance).
- **Type breakdown**: counts of creatures, instants, sorceries, etc.

Accepts the same `filters` parameter as `deck_list`, so you can ask things like "curve of just the creatures" or "curve excluding lands".

```
deck_curve  deck_id=<id>
deck_curve  deck_id=<id>, filters=[{type: "card-type", mode: "exclude", values: ["Land"]}]
deck_curve  deck_id=<id>, filters=[{type: "role", mode: "include", values: ["ramp"]}]
```

## Filter schema (shared by `deck_list` and `deck_curve`)

```json
{
  "type": "cmc" | "color" | "card-type" | "role" | "ownership",
  "mode": "include" | "exclude",
  "values": [...]
}
```

Value formats:
- `cmc`: numbers (`[0, 1, 2]`)
- `color`: WUBRG letters or `c` (`["r", "g"]` for red and green)
- `card-type`: card-type strings (`["Creature", "Instant"]`)
- `role`: role IDs (string slugs you defined via `manage_role`)
- `ownership`: `["unknown" | "owned" | "need_to_buy"]`

Pass an array of filter objects to AND them together. Each filter's `mode` controls whether it includes or excludes.

## Strategic notes → `deck_notes`

`deck_notes` returns the strategy commentary attached to a deck — combos, synergies, themes, and game-plan notes. Use when a user asks *how* a deck is meant to play, not *what* it contains.

This view doesn't require the Scryfall cache and is fast. It's distinct from `deck_list` which is about cards; `deck_notes` is about intent.

To add or modify notes, use `manage_deck_note` (covered below).

## `deck_pull_list` — physical assembly

When the user is preparing to physically pull cards from their collection:

`deck_pull_list  deck_id=<id>`

Returns cards grouped by their printing's set, with pull-status checkboxes. Useful for someone going through long boxes / binders to assemble the deck for play.

## `search_decks_for_card` — cross-deck inventory

"Which of my decks already use Sol Ring?" — `search_decks_for_card  card_name="Sol Ring"`. Checks both mainboard/sideboard/alternates AND the commander zone.

Useful for:
- Avoiding duplicate purchases across decks
- Finding a card you remember owning but forget which deck it's in
- Auditing which decks need a staple you just acquired

## Notes management — `manage_deck_note`

Three actions: `add`, `update`, `delete`.

Required for `add`: `title`, `content`, `note_type`. Note types:

| Type | Typical content |
|------|-----------------|
| `combo` | Multi-card combo lines (e.g. "Heliod + Walking Ballista") |
| `synergy` | Soft interactions between cards or themes |
| `theme` | High-level themes the deck plays into (Aristocrats, Voltron, Tokens, etc.) |
| `strategy` | Game-plan commentary, mulligan strategy, sequencing tips |
| `general` | Catch-all when none of the above fits |

Optional on `add`:
- `card_names: [...]` — cards referenced by this note, ordered by relevance
- `role_id: "ramp"` — propagate this role to all `card_names` automatically. Useful when categorizing a batch of cards via a note describing them.

On `update` and `delete`, `remove_role: true` will strip the propagated role from the associated cards (use when reorganizing).

## Discoverability — common confusions

- **`deck_list` vs `get_deck`.** When in doubt: `deck_list`. `get_deck` returns JSON; humans want markdown with oracle text.
- **`deck_curve` is not part of `deck_list`.** A prompt about mana curve needs the separate `deck_curve` tool.
- **`deck_notes` is read-only.** To add a note, use `manage_deck_note`.
- **`detail` means different things on `deck_list` vs `get_deck`.** `deck_list.detail` controls card-line verbosity (with or without oracle text). `get_deck.detail` controls whether audit fields are stripped from the JSON.

## Worked workflows

### "What's the mana curve of my Lathril deck, excluding lands?"

```
1. deck_curve  deck_id=<lathril-id>,
               filters=[{type: "card-type", mode: "exclude", values: ["Land"]}]
```

### "What's the strategy in this deck?"

```
1. deck_notes  deck_id=<id>
   (if empty or unclear:)
2. deck_list   deck_id=<id>
   → infer strategy from cards
```

### "Add a note: Atraxa + Pir = double counters combo"

```
manage_deck_note  action=add, deck_id=<id>,
                  title="Atraxa + Pir double counters",
                  note_type="combo",
                  card_names=["Atraxa, Praetors' Voice", "Pir, Imaginative Rascal"],
                  content="Atraxa proliferates each end step; Pir doubles those counter adds. Effectively quadruples the proliferate output on any creature with +1/+1 counters."
```

## Companion skills

- **mtg-deckbuilder-decks** — creating, modifying, exporting the deck itself
- **mtg-deckbuilder-lookup** — finding new cards via Scryfall search
- **mtg-deckbuilder-lists** — managing the interest list and other named card collections
