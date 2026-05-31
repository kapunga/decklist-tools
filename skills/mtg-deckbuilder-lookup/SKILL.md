---
name: mtg-deckbuilder-lookup
description: Search for Magic the Gathering cards through the mtg-deckbuilder MCP server's Scryfall integration. Use when a user wants to find cards by name, by attributes (color, type, mana cost, format legality), or by mechanical role ("find me artifact removal in red"). For query syntax, see the scryfall-search skill; for function:tag vocabulary, see the scryfall-tags skill.
---

# MTG Deckbuilder — Card Lookup

How to use the MCP server's Scryfall integration to find cards. This skill is intentionally thin — most knowledge lives in the **scryfall-search** skill (query grammar) and **scryfall-tags** skill (function:tag vocabulary). What's here is the *MCP-specific* nuance.

## Tool index

| Tool | Purpose |
|------|---------|
| `search_cards` | Search Scryfall by name, UUID, or full search query. Returns cards with metadata. |
| `get_collection_filter` | Generate a Scryfall filter clause from the user's tracked collection — combine with `search_cards` for "find cards I own that…" queries. |

## `search_cards` — three modes, auto-detected

The `query` parameter accepts:

1. **A card name** (fuzzy by default). `"Lightning Bolt"`, `"bolt"`, even `"lightning b"` may all resolve to Lightning Bolt.
2. **A Scryfall UUID** (rare; usually only when chaining tool calls).
3. **A full Scryfall search query** with operators (`c:r t:instant mv<=2`).

Detection is automatic, but it's not always right — see the gotcha below.

### Parameters

| Param | What it does |
|-------|--------------|
| `query` | The thing being searched (required) |
| `exact` | Use exact name matching instead of fuzzy (use when fuzzy returns the wrong card) |
| `limit` | Max results for search queries (default 10) |
| `set_code`, `collector_number` | Pin to a specific printing |
| `format` | `compact` (default, human-readable) or `json` (structured — use when chaining results into another tool call) |

## The auto-detect gotcha (critical)

When `query` looks like a single Scryfall operator (e.g. `function:artifact-removal` or `c:red`), the auto-detect heuristic often misroutes it to "card name lookup" and returns `Card not found`. This is **not** a Scryfall bug — Scryfall.com handles the same query fine — it's the MCP's parser being conservative.

**Fix:** always include at least two operators in any Scryfall query through this tool. Combine with a color, type, format, or mana value filter:

```
# This fails (single-operator):
search_cards  query="function:artifact-removal"
              → "Card not found"

# This works:
search_cards  query="function:artifact-removal c:r"
              → 269 results
```

When you really only have one logical filter, add a trivial second filter that doesn't change semantics:

```
search_cards  query="function:counterspell-noncreature game:paper"
```

(For the `game:paper` convention and other operators, see **scryfall-search**.)

## `get_collection_filter` — narrow to owned cards

Returns a Scryfall filter string composed from the user's tracked collection (per-set rarity inclusion based on collection levels). Use it to constrain `search_cards` results to cards the user is likely to own.

```
1. get_collection_filter
   → returns e.g. "(s:dmu r<=r OR s:lci r<=r OR s:mh3 r<=m)"

2. search_cards  query="<collection_filter> c:g function:ramp mv<=2"
   → only green 2-mana ramp from owned sets
```

Note: this filter reflects the user's *tracked* collection (set-level granularity with rarity levels), not their literal owned cards. It's a useful approximation, not a guarantee.

### Collection levels — what each level means

| Level | Includes |
|-------|----------|
| 1 | Commons + uncommons of the set |
| 2 | + rares |
| 3 | + mythics |
| 4 | All cards including special / promo rarities |

Configured per-set in the user's collection config. `get_collection_filter` returns the union across all configured sets.

## Worked workflows

### "Find me Boros artifact removal legal in Modern"

```
1. (consult scryfall-tags for the tag): function:removal-artifact
2. (consult scryfall-search for syntax): id:rw f:modern game:paper
3. search_cards  query="function:removal-artifact id:rw f:modern game:paper", limit=20
   → list of Boros Modern-legal artifact removal
```

### "Find tutors I own that fit my Esper commander deck"

```
1. get_collection_filter
   → collection_filter string

2. search_cards  query="<collection_filter> function:tutor-any id<=wub f:commander", limit=25
   → owned generic tutors in Esper identity
```

### "Quickly look up Sol Ring"

```
search_cards  query="Sol Ring"
   → single-card lookup via fuzzy name match
```

### Single-operator query — applying the workaround

```
# Goal: find every card tagged function:graveyard-hate
# Bare query fails:
search_cards  query="function:graveyard-hate"   → "Card not found"

# Add any second operator:
search_cards  query="function:graveyard-hate game:paper", limit=30
   → 200+ results
```

### Chaining: find a card and add the exact printing to a deck

```
1. search_cards  query="Lightning Bolt", format=json, limit=1
   → returns {set: "ema", collector_number: "127", ...}

2. manage_card   action=add, deck_id=<id>, cards=["ema 127"]
   → uses the resolved printing
```

## Companion skills

- **mtg-deckbuilder-decks** — add found cards to a deck via `manage_card add`
- **mtg-deckbuilder-lists** — save found cards to the interest list or a wishlist
- **mtg-deckbuilder-analysis** — once cards are added, verify they fit the curve / role distribution
- **scryfall-search** — query syntax, operators, common-pattern cookbook
- **scryfall-tags** — function:tag vocabulary (5,000+ tags categorized by deck-building role)
