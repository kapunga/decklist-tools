---
name: mtg-deckbuilder-lists
description: Manage named card lists in the mtg-deckbuilder MCP server — the default interest list, additional user-created lists (wishlists, scanned collections, custom lists, or more interest-kind lists). Use when a user wants to "save this card for later", "add to my wishlist", "track cards I've scanned", or otherwise work with cards outside the context of a specific deck.
---

# MTG Deckbuilder — Card Lists

How to work with **named card collections** that exist outside any specific deck — the default interest list, plus any wishlists, scanned card pools, tracked collections, or custom lists the user has created.

## Tool index

| Tool | Purpose |
|------|---------|
| `list_card_lists` | List all saved card lists with id, name, kind, description, card count. |
| `get_card_list` | Get a single card list with all entries. Identifier may be UUID or name (case-insensitive). |
| `manage_card_list` | Create / delete / rename a list, or add / remove cards within one. |

## Lists are not decks

A `CardList` and a `Deck` both contain cards in `cardSets`, but they're semantically different:

| | Deck | List |
|---|------|------|
| Has format validation | Yes (60/100/etc) | No |
| Has color identity | Yes | No |
| Has mana curve | Yes (via `deck_curve`) | No (no curve view) |
| Has roles | Yes | No |
| Has commanders | If format = commander | No |
| Per-entry "potential decks" | No | **Yes** — entries can link to multiple decks the card *might* fit |
| Has a `kind` enum | No | Yes (interest, collection, scan, wishlist, custom) |

If a user is iterating on what cards to play, that's a deck. If they're cataloging cards as raw material — for future deck use, for tracking what they own, for what to buy — that's a list.

## "The interest list" vs interest-kind lists — important distinction

There's **one reserved default interest list** at fixed UUID `INTEREST_LIST_ID = '00000000-0000-4000-8000-000000000001'` — always exists, can't be deleted, has `kind: 'interest'`. But `kind: 'interest'` is also a freely-assignable enum: users may create additional interest-kind lists (e.g. one per archetype they're brewing). The default is one specific instance, not the only one.

Disambiguate from phrasing:

| User phrasing | Likely intent |
|---------------|---------------|
| *"save it to the interest list"* (definite article, no qualifier) | Default — use `INTEREST_LIST_ID` |
| *"my interest list"* (singular possessive) | Default, unless `list_card_lists` reveals multiple interest-kind lists |
| *"my Atraxa interest list"* (named qualifier) | A specific named list — look it up by name |
| *"my interest lists"* (plural) | All interest-kind lists |
| *"an interest list"* (indefinite article) | Ambiguous — call `list_card_lists` and ask which one |

```
# Read the default interest list directly
get_card_list  identifier="00000000-0000-4000-8000-000000000001"

# Read by name (case-insensitive) — useful for named interest-kind lists
get_card_list  identifier="Atraxa Brewing Pile"
```

## List `kind` — what each value means

When creating a list, the `kind` parameter classifies it:

| Kind | Typical use |
|------|-------------|
| `interest` | "Cards I want to remember" — for inspiration / future deck consideration. The default interest list has this kind, but you can create additional interest-kind lists (e.g. one per archetype, one per playgroup). |
| `collection` | A tracked subset of physical collection (e.g. cards in a specific binder or storage box). |
| `scan` | A batch of cards scanned into the system, e.g. a partial-set scan pull. |
| `wishlist` | Cards the user intends to acquire. |
| `custom` | None of the above — defaults to this if `kind` not provided. |

`kind` is descriptive metadata — it doesn't change tool behavior. Pick the one that matches user intent so future inspection (`list_card_lists`) shows meaningful kinds. Note: nothing about the system enforces "one list per kind" — a user may have multiple `interest`, `wishlist`, etc. lists.

## `manage_card_list` actions

Five actions on `manage_card_list`. Required fields vary:

| Action | Required | Optional |
|--------|----------|----------|
| `create` | `name` | `kind`, `description` |
| `delete` | `id` | (none — fails on interest list) |
| `rename` | `id`, `name` | `description` |
| `add` | `id`, `name` (= card name) | `set_code`, `collector_number`, `quantity`, `notes`, `potential_decks`, `source` |
| `remove` | `id`, `card_name` | (none) |

Note the **field-name reuse**: on `add`, `name` is the **card name** being added. On `create` / `rename`, `name` is the **list name**. Same parameter; different meaning by action.

## `add`-specific fields

| Field | What it does |
|-------|--------------|
| `set_code` + `collector_number` | Pin to a specific printing (instead of fuzzy name lookup) |
| `quantity` | Number of copies (default 1) |
| `notes` | Free-form text, e.g. "saw this in JJ's deck, looked great" |
| `potential_decks` | Array of deck IDs this card might fit. Lets you triage interest list later: "which deck does each card belong to?" |
| `source` | Provenance string. Conventional values: `user`, `import`, `claude`. Use `claude` when adding cards via a Claude-driven workflow (so the user can later see what was added by which agent). |

`source` is stored as a free string but the project convention is one of the three above. Stick to those unless the user asks for something else.

## Discoverability — common confusions

- **`manage_card_list` is not `manage_card`.** `manage_card` (in **mtg-deckbuilder-decks**) operates on cards inside a deck. `manage_card_list` operates on standalone lists. When a user says "add Sol Ring to the interest list", that's `manage_card_list`, not `manage_card`.
- **"The interest list" ≠ "an interest-kind list".** The default interest list is one specific UUID. Users can also create additional `kind: 'interest'` lists. When the user's phrasing is ambiguous, call `list_card_lists` and check — if there are multiple interest-kind lists and the user didn't name one, ask.
- **`name` is overloaded on `manage_card_list`.** On `create`/`rename` it means list name; on `add` it means card name. Always check the action.
- **Identifier resolution.** `get_card_list` and the `id` field on `manage_card_list` accept either UUIDs or list names (case-insensitive). For the default interest list specifically, prefer the UUID `INTEREST_LIST_ID` — it's faster and avoids any chance of a name collision with another list the user has renamed.

## Worked workflows

### "Add Sol Ring to my interest list" (assumes default)

```
# Singular possessive with no qualifier — default interest list.
manage_card_list  action=add,
                  id="00000000-0000-4000-8000-000000000001",
                  name="Sol Ring",
                  source="claude"
```

### "Add Sol Ring to an interest list" — disambiguate first

```
1. list_card_lists
   → e.g. ["Default interest list (interest)", "Atraxa Brewing Pile (interest)", "Bant Toolbox (interest)"]

2. (multiple interest-kind lists exist — ask the user which one)

3. (after user picks "Atraxa Brewing Pile")
   get_card_list  identifier="Atraxa Brewing Pile"
   → returns the list, including its id

   manage_card_list  action=add,
                     id=<atraxa-brewing-pile-id>,
                     name="Sol Ring",
                     source="claude"
```

### "Save this card to my interest list with a note about which deck it might fit"

```
manage_card_list  action=add,
                  id="00000000-0000-4000-8000-000000000001",
                  name="Esper Sentinel",
                  notes="potential replacement for Phyrexian Arena in Atraxa — lower MV, easier T1 deploy",
                  potential_decks=["<atraxa-deck-id>"],
                  source="claude"
```

### "Show me my interest list"

```
get_card_list  identifier="00000000-0000-4000-8000-000000000001"
```

### "Create a wishlist for the Modern deck I'm planning"

```
1. manage_card_list  action=create,
                     name="Modern Tron Wishlist",
                     kind="wishlist",
                     description="Cards I need to acquire to assemble Mono-Green Tron"

   → returns list_id

2. manage_card_list  action=add, id=<list_id>, name="Karn Liberated", quantity=4
   manage_card_list  action=add, id=<list_id>, name="Wurmcoil Engine", quantity=2
   …
```

### "Review my interest list and decide which deck each card fits"

```
1. get_card_list  identifier="00000000-0000-4000-8000-000000000001"
   → list of cards with notes and existing potential_decks

2. list_decks
   → see what decks exist

For each card, decide which deck(s) it fits, then either:
- Add to those decks via mtg-deckbuilder-decks (`manage_card add`)
- Update potential_decks on the list entry (re-add with new potential_decks)
- Remove from interest list once it's placed in a deck:
  manage_card_list  action=remove, id=<list_id>, card_name=<name>
```

### "Add all the cards from a Scryfall search to my interest list"

```
1. search_cards  query="function:graveyard-hate id<=ub game:paper", format=json, limit=20
   → list of card objects

For each result:
2. manage_card_list  action=add,
                     id="00000000-0000-4000-8000-000000000001",
                     name=<card_name>,
                     set_code=<set>,
                     collector_number=<num>,
                     source="claude",
                     notes="from Scryfall search: graveyard hate in Dimir colors"
```

## Companion skills

- **mtg-deckbuilder-decks** — when a list card graduates into an actual deck, add it there via `manage_card add`
- **mtg-deckbuilder-lookup** — find cards to add to a list via Scryfall search
- **mtg-deckbuilder-analysis** — if you're not sure whether something belongs in a deck or just on the interest list, look at the deck's curve/roles first
