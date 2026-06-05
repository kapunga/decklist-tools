---
name: mtg-deckbuilder-decks
description: Drive the mtg-deckbuilder MCP server to create, modify, and export Magic the Gathering decks — setting up a new deck, adding/removing/moving cards, assigning roles, managing commanders, and exporting for paper play or import into other tools (Moxfield, Archidekt, plain text). Use when a user says "build a deck", "add this card to my deck", "swap my commander", "export the deck", or similar lifecycle prompts.
metadata:
  version: "2026-06-04"
---

# MTG Deckbuilder — Deck Lifecycle

How to drive the `mtg-deckbuilder` MCP server through the lifecycle of a deck: creation, card management, role assignment, commander updates, and export.

## Tool index

| Tool | Purpose |
|------|---------|
| `list_decks` | List every saved deck with name, format, card count, commanders, updatedAt. Starting point for "which decks do I have?" |
| `manage_deck` | Create, update, or delete a deck (name, format, archetype, description). |
| `manage_card` | Add, remove, update, or move cards within a deck. The workhorse — covers 90% of curation work. |
| `manage_commander` | Add, remove, or swap commanders. Commander-format only. Auto-recomputes color identity. |
| `list_roles` | List available roles. Pass `deck_id` to see custom roles, not just globals. |
| `manage_role` | Create, update, or delete role definitions. Six actions: `add_custom`/`add_global` and their `update`/`delete` siblings. |
| `deck_export` | Emit the deck as text in one of three formats (moxfield, archidekt, simple). |

## The four card sets

Every deck has a fixed set of "card sets" — named buckets that cards live in:

| Internal name | What it's for |
|---------------|---------------|
| `mainboard` | The deck itself. The 60 / 100 / 99+commander cards. |
| `sideboard` | Format sideboard (constructed) — strictly 15 in Modern/Standard/etc. Empty in Commander. |
| `alternates` | Cards under consideration but not in the main 60/99. Effectively a "maybeboard" / cut-but-not-deleted pile. |
| `cut` | Cards that have been cut from the deck *with notes about why*. Soft-delete with provenance — distinct from `remove`. |

These are the only valid values for `manage_card`'s `from`/`to` parameters (on the `move` action).

**Naming note for exports:** what's internally called `alternates` is exported as `maybeboard` (e.g. in Moxfield's import grammar). The internal name `alternates` was chosen to disambiguate from the format-specific `sideboard` term. When a user says "maybeboard" they mean `alternates`.

## Quantity semantics — every action is different

This is the easiest place to make a costly mistake.

| Action | Quantity default | When required |
|--------|------------------|---------------|
| `add` | 1 copy | Use `Nx` prefix in the `cards` array (e.g. `"2x fdn 542"`) for multiples |
| `remove` | All copies | Pass `quantity: N` to remove only some |
| `move` | All copies **only when source has 1 copy** | Required when source has >1 — refusing this default prevents accidental bulk moves |
| `update` | (n/a — operates on the entry regardless of stack size) | |

A common mistake: calling `move` on a 4-of without `quantity`, expecting "move one." The server will reject it. State the quantity explicitly any time you suspect the card might have multiple copies.

## Cards array syntax

`manage_card`'s `cards` parameter is the modern batch interface. Syntax depends on action:

- **For `add`:** `"<set_code> <collector_number>"` strings, optionally prefixed with `Nx`:
  ```
  cards: ["fdn 542", "2x woe 138", "3x dmu 161"]
  ```
  This guarantees a specific printing. The deprecated single-card fields (`name`, `set_code`, `collector_number`) still work but are discouraged.

- **For `remove`, `update`, `move`:** card names (case-insensitive):
  ```
  cards: ["Lightning Bolt", "Counterspell"]
  ```

Avoid mixing single-card params (`name`, `set_code`, `collector_number`) with the `cards` array.

## Roles — global vs custom

Roles are a flexible tagging layer on individual `CardEntry` records. They have no built-in semantics — you can define whatever roles make sense for the deck (Ramp, Card Draw, Removal, Combo Piece, etc.).

| Scope | Defined where | Visible to which decks |
|-------|---------------|------------------------|
| Global | Stored in `global-roles.json` | Every deck |
| Custom | Stored on a specific deck | That deck only |

**`list_roles` defaults to globals only.** If a user asks "what roles does this deck have?", pass `deck_id` or you'll miss the custom ones.

Six actions on `manage_role`: `add_custom`, `update_custom`, `delete_custom`, `add_global`, `update_global`, `delete_global`. `add_custom`/`update_custom`/`delete_custom` require `deck_id`.

Assigning roles to cards uses `manage_card` with action `update`:
- `roles: [...]` replaces the card's role list
- `add_roles: [...]` appends without removing existing ones
- `remove_roles: [...]` strips specific roles

## Delegating bulk role assignment

Tagging a whole deck with roles — going card by card deciding what's ramp, removal, draw, a combo
piece — is a large read-and-reason job: it needs every card's oracle text and a judgment per card.
If your client supports subagents (a delegation / task tool), spread it out so that reasoning
happens in throwaway contexts and only the conclusions come back.

**Partition by role.** Give each subagent a *small* group of roles — roughly two — and the deck's
card list. Each subagent figures out, for *its* roles only, which cards qualify, and returns a
compact mapping of `role → [card names]`. Partitioning by role (rather than by card) keeps each
subagent's job coherent and its output small.

**Brief each subagent with** the `deck_id`, its assigned roles (with definitions, since role names
have no built-in semantics — see "Roles — global vs custom" above), and a pointer to the
**scryfall-tags** skill if it wants the `function:` vocabulary to reason about mechanical roles.

**You apply the results.** The subagents are read-only; they return mappings, you make the edits.
For each returned `role → [cards]` group, apply it in one call with
`manage_card action=update, add_roles=["<role>"], cards=[...]` (append, don't clobber existing
roles). Alternatively, `manage_deck_note` with a `role_id` propagates a role to all of a note's
`card_names` in a single call (see **mtg-deckbuilder-analysis**). Keeping the writes in the main
agent means every role assignment stays visible to you.

## Commander format quirks

`manage_commander` is Commander-only. Three actions:

| Action | What it does |
|--------|--------------|
| `add` | Add a commander. Resolves printing via Scryfall (optional `set_code`/`collector_number` to pin a specific printing). |
| `remove` | Remove a commander. |
| `swap` | Replace one commander with another in a single call. Requires `new_commander_name`. |

After every commander action the server **recomputes the deck's `colorIdentity`** as the union of all commanders' identities. You don't need to manage this manually.

## Export formats

Three output formats. Pick by where the user is pasting:

| Format | Where to paste |
|--------|----------------|
| `moxfield` | Moxfield deck-import grammar (best for Moxfield links) |
| `archidekt` | Archidekt import |
| `simple` | Plain `N Card Name` per line — universal fallback |

Arena and MTGO are intentionally not export targets: Arena has no usable import flow to paste into, and MTGO's import is offline-client-only.

Options:

- `include_sideboard: false` to omit the sideboard from the output (default true).
- `include_maybeboard: false` to omit alternates-as-maybeboard from the output (default true).
- `section: 'mainboard' | 'sideboard' | 'maybeboard'` — emit only one section. Useful for Moxfield's UI which has separate paste boxes per section. Remember: `maybeboard` here is the export term for the internal `alternates` set.

## Ownership tracking

`manage_card add` and `update` accept an `ownership` enum:

| Value | Meaning |
|-------|---------|
| `unknown` | Default — we don't know if the user owns it |
| `owned` | User has the card |
| `need_to_buy` | User needs to acquire it |

Useful for "what cards do I still need to buy for this deck?" workflows — combine with `deck_list` filtered to `ownership: need_to_buy`.

## Discoverability — common confusions

- **`manage_card remove` vs `manage_card move → cut`.** `remove` deletes the entry entirely. `move → cut` preserves the entry (and any notes about why it was cut) in the `cut` set. When a user says "take this out of the deck", ask whether they want to preserve the cut history; if they're iterating on the deck, `move → cut` is almost always the right call.
- **`manage_card_list` is *not* this skill's `manage_card`.** `manage_card` operates on cards inside a deck. `manage_card_list` operates on standalone named card lists (interest list, wishlists). See **mtg-deckbuilder-lists**.
- **Cut is move-only.** You cannot `add` directly to `cut` — only `move` cards there from another set.

## Worked workflows

### Build a new Commander deck from scratch

```
1. manage_deck       action=create, name="Atraxa Counters", format=commander
                     → returns deck_id

2. manage_commander  action=add, deck_id=<id>, commander_name="Atraxa, Praetors' Voice"
                     → colorIdentity auto-set to wubg

3. manage_card       action=add, deck_id=<id>,
                     cards=["c20 250", "dmu 261", "2x cmm 678"]
                     → cards added to mainboard

4. manage_role       action=add_custom, deck_id=<id>, id="counters-payoff",
                     name="Counters Payoff", color="#7cb"
                     → custom role created for this deck

5. manage_card       action=update, deck_id=<id>, cards=["Pir, Imaginative Rascal"],
                     add_roles=["counters-payoff"]

6. deck_export       deck_id=<id>, format=moxfield
                     → text ready to paste into Moxfield
```

### Swap a commander

```
manage_commander  action=swap, deck_id=<id>,
                  commander_name="Atraxa, Praetors' Voice",
                  new_commander_name="Ezuri, Claw of Progress"
                  → old commander removed, new added, colorIdentity recomputed
```

### Cut a card while preserving the reasoning

```
1. manage_card  action=update, deck_id=<id>, cards=["Phyrexian Arena"],
                notes="cutting for Esper Sentinel — lower MV, easier to deploy turn 1"

2. manage_card  action=move, deck_id=<id>, cards=["Phyrexian Arena"],
                from="mainboard", to="cut", quantity=1
                → card preserved in `cut` with the note attached
```

### Export each section separately (Moxfield UI workflow)

```
1. deck_export  deck_id=<id>, format=moxfield, section="mainboard"
2. deck_export  deck_id=<id>, format=moxfield, section="sideboard"
3. deck_export  deck_id=<id>, format=moxfield, section="maybeboard"   # the alternates set
```

Paste each into the matching Moxfield box.

## Companion skills

- **mtg-deckbuilder-lookup** — finding cards to add (via `search_cards` + Scryfall)
- **mtg-deckbuilder-analysis** — viewing, mana curve, notes, cross-deck card search
- **mtg-deckbuilder-lists** — saving cards outside the context of a specific deck (interest list, wishlists)
- **scryfall-search** — Scryfall query grammar (needed when building queries for the lookup skill)
- **scryfall-tags** — function:tag vocabulary for searching by mechanical role
