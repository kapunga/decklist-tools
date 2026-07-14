---
name: mtg-deckbuilder-lookup
description: Search for Magic the Gathering cards through the mtg-deckbuilder MCP server's Scryfall integration. Use when a user wants to find cards by name, by attributes (color, type, mana cost, format legality), or by mechanical role ("find me artifact removal in red"). For query syntax, see the scryfall-search skill; for function:tag vocabulary, see the scryfall-tags skill.
metadata:
  version: "2026-07-14"
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

## `get_collection_filter` — scope to owned sets, judge likelihood yourself

Returns a Scryfall filter string scoped to the sets in the user's tracked collection — set only, no rarity gating. Each set also comes back with its `level` (1-4) and the `rarities` typically associated with that level. Use the filter to scope `search_cards` to owned sets; use `level` plus each result's own `rarity` field as a **soft signal** for how likely the user is to own a specific card — never as a hard include/exclude. A set tracked at level 1 ("a few packs") still contains real rares and mythics; a few packs guarantee several rare-slot pulls, just not any *specific* rare. Don't drop higher-rarity cards from a lower-level set — surface them, flagged as less certain.

```
1. get_collection_filter
   → filterString: "(set:dmu) OR (set:lci) OR (set:mh3)"
     sets: [
       { setCode: "dmu", level: 1, rarities: ["common","uncommon"] },
       { setCode: "lci", level: 2, rarities: ["common","uncommon","rare"] },
       { setCode: "mh3", level: 3, rarities: ["common","uncommon","rare","mythic"] }
     ]

2. search_cards  query="<filterString> c:g function:ramp mv<=2"
   → green 2-mana ramp from those sets, each result carrying its own `rarity`
```

**Judging likelihood:** compare each result's `rarity` against its set's `level`/`rarities`. A card whose rarity is covered by the set's `rarities` is likely owned; a card whose rarity exceeds it (e.g. a mythic from a set tracked at level 1) is less likely owned but still real — present it, flagged, don't drop it from the results.

Because the filter is set-only, it's typically well under Scryfall's 500-character query limit even for large collections — see the **scryfall-search** skill's "Query length limit" section if you still hit it after combining with many other filters.

### Collection levels — what each level means

| Level | Includes |
|-------|----------|
| 1 | Commons + uncommons of the set |
| 2 | + rares |
| 3 | + mythics |
| 4 | All cards including special / promo rarities |

Configured per-set in the user's collection config. `get_collection_filter` returns the union across all configured sets. Treat these as typical rarities for that engagement level, not a ceiling — see "Judging likelihood" above.

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
   → filterString scoped to owned sets, sets[] with level + rarities

2. search_cards  query="<filterString> function:tutor-any id<=wub f:commander", limit=25
   → tutors from owned sets in Esper identity, each with its own `rarity`

3. For each result, compare its `rarity` to its set's tracked `level`/`rarities`
   from step 1 — present commons/uncommons from a level-1 set as likely owned,
   flag a rare/mythic from that same set as possible-but-unconfirmed rather
   than omitting it.
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

## Delegating an exploratory search

If your client supports subagents (a.k.a. a delegation / task tool), an open-ended search is a
good thing to hand off. The win is context: an exploratory search fans out into several
`search_cards` calls, each returning many cards with full oracle text — a lot of tokens for a
question whose answer is "here are a handful of candidates."

**When to delegate.** Reach for a subagent when the search is *exploratory and likely to iterate*:
"find removal that fits this deck", "what cheap green ramp could I run", "show me payoffs for an
artifacts theme." **Do not** delegate a single-card name lookup ("look up Sol Ring") — that's one
call returning one card; delegation would only add a round-trip.

**Brief the subagent with** (it starts with a fresh context, so spell these out):
- the search goal in plain language;
- the hard constraints — color identity, format, mana-value ceiling, and the
  `get_collection_filter` string if the user wants owned-only results;
- a pointer to consult the **scryfall-search** skill (query grammar) and **scryfall-tags** skill
  (function:tag vocabulary), and to apply the two-operator workaround from "The auto-detect
  gotcha" above so its queries don't misroute.

**Ask it to return** a compact shortlist — roughly 5–10 candidates, each as a name plus a
one-line reason it fits — **not** raw `search_cards` output. The shortlist is what re-enters the
main conversation; the bulky result pages stay in the subagent's context.

**Read-only.** The subagent searches and reports; it does not add cards. You (and the user) decide
what to keep and add it via **mtg-deckbuilder-decks** (`manage_card add`) or save it via
**mtg-deckbuilder-lists**.

## Companion skills

- **mtg-deckbuilder-decks** — add found cards to a deck via `manage_card add`
- **mtg-deckbuilder-lists** — save found cards to the interest list or a wishlist
- **mtg-deckbuilder-analysis** — once cards are added, verify they fit the curve / role distribution
- **scryfall-search** — query syntax, operators, common-pattern cookbook
- **scryfall-tags** — function:tag vocabulary (5,000+ tags categorized by deck-building role)
