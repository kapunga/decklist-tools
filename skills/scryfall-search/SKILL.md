---
name: scryfall-search
description: How to construct Scryfall search queries for Magic the Gathering. Use when you need to find cards by attributes (color, type, mana cost, power/toughness, format legality, oracle text, etc.) or when composing a multi-operator query — on scryfall.com, through the Scryfall API, or via an MTG-aware MCP tool. For looking up specific function/oracle tag names, see the scryfall-tags skill instead.
---

# Scryfall Search Syntax

A practical guide to writing Scryfall queries — operator reference plus a cookbook of common deck-building patterns.

## How Scryfall queries work

A query is a space-separated list of operators. Operators combine with **implicit AND**. There's an explicit `OR` keyword (uppercase) and `-` prefix for negation. Parentheses group sub-expressions.

```
c:r t:creature mv<=3                       implicit AND across three operators
(t:elf OR t:goblin) c:g                    OR with grouping
t:creature -t:legendary                    negation
o:"draw a card"                            multi-word phrase needs quotes
```

The full canonical reference: <https://scryfall.com/docs/syntax>. This skill covers the operators you'll actually reach for ~95% of the time.

## Core operators

### Colors and color identity

`c:` is **the colors printed on the card**. `id:` is **color identity** (the colors of any mana symbol anywhere on the card, including activated abilities and reminder text). For Commander, you almost always want `id:`, not `c:`.

| Operator | Meaning | Example |
|----------|---------|---------|
| `c:r` | exactly contains red | `c:r t:creature` |
| `c:rw` | both red and white | `c:rw` (boros multicolor) |
| `c=rw` | exactly red and white, nothing else | `c=rw` (pure Boros, no mono) |
| `c<=rw` | subset of red and white | `c<=rw` (mono-red, mono-white, or Boros) |
| `c>=rw` | superset of red and white | `c>=rw` (Boros plus any extras) |
| `c:colorless` or `c:c` | colorless | `c:c t:artifact` |
| `c:m` | multicolor | `c:m t:creature` |
| `id:wub` | color identity is Esper | `id:wub f:commander` |
| `id<=wub` | identity fits within Esper | `id<=wub f:commander` (your Esper commander's deck) |

Color letters: `w` u `b` `r` `g` `c` (colorless), `m` (multicolor). Guild names also work: `c:azorius`, `c:dimir`, `c:rakdos`, etc.

### Card types

| Operator | Meaning |
|----------|---------|
| `t:creature` | type line contains "Creature" |
| `t:legendary` | supertype |
| `t:dragon` | subtype (matches Dragon creatures, tribal cards, etc.) |
| `t:legendary t:creature t:elf` | compound — legendary elf creatures |
| `-t:land` | negation |

All type-line tokens work as values: `t:instant`, `t:sorcery`, `t:artifact`, `t:enchantment`, `t:planeswalker`, `t:land`, `t:battle`, `t:tribal`, `t:basic`, `t:snow`, `t:equipment`, `t:aura`, `t:saga`, `t:vehicle`.

### Mana cost and mana value

| Operator | Meaning | Example |
|----------|---------|---------|
| `mv:3` or `mv=3` | mana value equals 3 | `t:creature mv:3` |
| `mv<=2`, `mv>=4`, `mv<5`, `mv>0` | numeric comparison | `c:r mv<=1` (one-mana red) |
| `cmc=3` | legacy alias for `mv` | (use `mv` in new queries) |
| `m:{R}{R}` | exact mana cost | `m:{2}{R}{R}` matches 2RR exactly |
| `m>=2r` | costs at least one red | `m>=rr` (at least two red pips) |
| `produces:r` | produces red mana | `t:land produces:r produces:g` |
| `devotion>=rr` | devotion to red ≥ 2 | (for devotion-payoff decks) |

### Power, toughness, loyalty

| Operator | Meaning |
|----------|---------|
| `pow>=4`, `pow<=2`, `pow=0`, `pow:*` | power comparisons (`*` for variable) |
| `tou>=4`, `tou<=2`, `tou:*` | toughness comparisons |
| `pow=tou` | square stats |
| `pow>tou` | beefy attackers |
| `pow!=tou` | asymmetric |
| `loy>=4` | starting loyalty (planeswalkers) |

### Card text (oracle)

| Operator | Meaning | Example |
|----------|---------|---------|
| `o:flying` | oracle text contains "flying" (any form) | `t:creature o:flying` |
| `o:"draw a card"` | exact phrase (quote it) | `o:"draw a card" mv<=2` |
| `-o:trample` | negation in oracle text | `t:creature -o:trample` |
| Multiple `o:` | implicit AND | `o:trample o:lifelink` |

`fo:` is the same but searches "full" Oracle text including reminder text. `keyword:flying` is a strict keyword-ability match — narrower than `o:flying` (which matches reminder text and other mentions).

### Format legality

| Operator | Meaning |
|----------|---------|
| `f:commander` | legal in this format |
| `f:standard`, `f:modern`, `f:pioneer`, `f:legacy`, `f:vintage`, `f:pauper`, `f:historic`, `f:brawl`, `f:alchemy`, `f:explorer`, `f:duel`, `f:premodern`, `f:oldschool` | other formats |
| `legal:standard` | alias for `f:standard` |
| `banned:modern` | banned in the named format |
| `restricted:vintage` | restricted in the named format |

### Game availability

Which platform(s) a card exists on. Most "what can I actually play" queries should pin this down — without it, results include Alchemy / Arena-exclusive / MTGO-only cards alongside paper cards.

| Operator | Meaning |
|----------|---------|
| `game:paper` | exists in paper form |
| `game:arena` | exists on Magic: The Gathering Arena |
| `game:mtgo` | exists on Magic Online |
| `-game:paper` | exclude paper-existing cards (rare — for digital-only analysis) |
| `-game:arena` | exclude Arena cards (e.g. filter out Alchemy rebalances) |
| `is:digital` | the *printing* is digital-only (Alchemy, etc.) |

**Heuristic:** include `game:paper` by default unless you specifically want digital-only or cross-platform results. Combine with `-game:arena` if you want paper-only with no Arena rebalances either.

### Sets, rarity, prints

| Operator | Meaning | Example |
|----------|---------|---------|
| `s:dmu` or `set:dmu` | a specific set code | `s:lci c:u` |
| `e:moc` | edition / printing | (interchangeable with `s:`) |
| `r:c`, `r:u`, `r:r`, `r:m` | rarity | `r:m c:r f:standard` |
| `r<=u` | rarity at most uncommon | `r<=u t:creature` (low-rarity creatures) |
| `is:firstprint` | first printing of the card | `is:firstprint year:2024` |
| `is:reprint` | a reprint | |
| `year:2024`, `year>=2020` | released year | |

### Special predicates (the `is:` family)

| Operator | Meaning |
|----------|---------|
| `is:commander` | can be a commander |
| `is:partner`, `is:companion`, `is:friendsforever` | partner-style mechanics |
| `is:reserved` | on the Reserved List |
| `is:permanent` | non-instant, non-sorcery |
| `is:nonland` | excludes lands |
| `is:split`, `is:flip`, `is:dfc`, `is:mdfc`, `is:transform`, `is:meld` | multi-faced card layouts |
| `is:funny` | Un-set / Mystery Booster Playtest / silver-border |
| `is:reprint` / `is:firstprint` | print provenance |

### Tag namespaces (cross-reference)

For text-derived tag searches, use `function:<tag>` (or aliases `oracletag:<tag>` / `otag:<tag>` — they all hit the same index). For art-derived tags use `art:<tag>`. See the **scryfall-tags** skill for the full tag vocabulary and a search script for the tag index.

```
function:artifact-removal c:r              red artifact removal
art:dragon c:r                              cards depicting dragons
```

### Combinators

- **Implicit AND** between operators: `c:r t:creature mv<=3`
- **Explicit OR** (uppercase): `(t:elf OR t:goblin) c:g`
- **NOT** with `-` prefix: `-t:land`, `-o:flying`
- **Parentheses** for grouping: `id<=ur (t:instant OR t:sorcery)`
- **Quoted phrases** for multi-word values: `o:"deals damage"`, `a:"Rebecca Guay"`

## Cookbook: common deck-building queries

Most of these include `game:paper` since they're aimed at real deck construction. The ones without are deliberate — pure-analysis or cross-platform questions.

```
# Mono-red one- and two-drop creatures in Standard (paper only)
c:r t:creature mv<=2 f:standard game:paper

# Commander color identity filter for an Esper deck
id<=wub f:commander game:paper

# Artifact tutors legal in Modern under 4 mana
function:tutor-artifact f:modern mv<=3 game:paper

# Cheap blue counterspells (≤2 mana, not creatures)
c:u function:counterspell-noncreature mv<=2 game:paper

# Equipment that grants haste
t:equipment function:gives-haste game:paper

# Lifegain payoffs in Orzhov for Commander
id<=wb (function:lifegain-matters OR function:repeatable-lifegain) f:commander game:paper

# All legendary dragons that fit in a 7-mana commander deck
t:legendary t:dragon mv<=7 game:paper

# Reanimation spells in Modern at instant speed under 5 mana
function:reanimate-creature f:modern mv<=4 t:instant game:paper

# Mana rocks under 3 mana, excluding Reserved List (paper play, no Alchemy)
function:mana-rock mv<=2 -is:reserved game:paper -game:arena

# Cards that became Standard-legal in a specific recent set
f:standard s:lci game:paper

# Big green creatures with trample, mv ≤ 5
c:g t:creature o:trample pow>=4 mv<=5 game:paper

# All commanders with partner from Battlebond
is:partner is:commander s:bbd

# Analysis / cross-platform queries (no game: filter on purpose):

# Cards with hexproof and lifelink (any printing, any platform)
keyword:hexproof keyword:lifelink

# Counterspells that exile instead of countering to graveyard
function:counterspell-exile

# Cards art-tagged as dragons that aren't actually Dragon-typed (trivia)
art:dragon -t:dragon

# Alchemy-exclusive rebalances of existing cards
game:arena -game:paper is:digital
```

## Gotchas

1. **Multi-word phrases must be quoted in `o:`.** `o:draw a card` matches cards whose oracle text contains "draw" AND "a" AND "card" anywhere, in any order. `o:"draw a card"` matches the exact contiguous phrase.

2. **`OR` is case-sensitive and must be uppercase.** `t:elf or t:goblin` doesn't do what you think.

3. **Negation binds tightly.** `-o:flying` negates that one operator. To negate a group, parenthesize: `-(t:creature mv<=2)`.

4. **`f:` includes the reprint history check.** A card legal in Modern may have older printings that pre-date the format. `f:modern` returns all cards legal in Modern regardless of printing — that's what you want.

5. **For 0-result queries, check for typos in `function:` tags.** Tag names are exact; `function:artifact-remove` returns 0 because the actual tag is `artifact-removal`. See the scryfall-tags skill for the canonical tag list.

6. **Tool-specific wrappers may add their own quirks.** If you're searching through an MTG-aware tool rather than scryfall.com directly, the tool may route single-operator queries to a card-name lookup endpoint and fail. Workaround: include at least two operators (any second filter — color, format, type — will do).

## See also

- **scryfall-tags** — the `function:`/`oracletag:`/`otag:` tag vocabulary referenced throughout the cookbook above.
