---
name: scryfall-tags
description: Reference for Scryfall's functional tag taxonomy. Use when searching Magic the Gathering cards by mechanical role (removal, ramp, card draw, tutors, counterspells, recursion, tribal payoffs, token producers, etc.) via the `function:` or `oracletag:` query operators — whether on scryfall.com directly, via the API, or through any MTG-aware tool.
metadata:
  version: "2026-05-31"
---

# Scryfall Functional Tag Reference

Scryfall indexes Magic cards with thousands of community-curated **functional tags** via the [Tagger project](https://tagger.scryfall.com). Searching by tag is far more powerful than searching by oracle text — you find every card that *does the thing*, not every card whose rules text happens to contain a keyword.

## Search syntax

Two distinct tag namespaces, with multiple operator names for the first:

| Operator | What it matches |
|----------|-----------------|
| `function:<tag>` | Text-derived tag — what the card *does* or what its rules text matches |
| `oracletag:<tag>` | Alias for `function:` — same index, same results |
| `otag:<tag>` | Short alias for `function:` — same index, same results |
| `art:<tag>` | Art tag — what the card art *depicts* (separate index) |

Verified empirically: `function:artifact-removal c:r`, `oracletag:artifact-removal c:r`, and `otag:artifact-removal c:r` all return identical 269-card result sets. The three text-tag operators are aliases for one underlying index. `art:` is genuinely separate (e.g. `art:dragon c:r` returns 489 cards including non-Dragon-typed cards whose art depicts a dragon).

Tags use `kebab-case-slugs`. Combine with normal Scryfall operators:

```
function:removal-creature c:b mv<=3        # cheap black creature removal
function:tutor-land f:commander             # land tutors in commander format
function:ramp -function:land mv<=2          # non-land ramp at 2 mana or less
function:typal-elf type:creature             # elf tribal payoffs
function:reanimate-creature c:bg            # Golgari reanimation
```

The full canonical tag list lives at <https://scryfall.com/docs/tagger-tags>.

## Top categories — curated starting points

These are the highest-leverage tags for general deck building. Each category has a corresponding `reference/<category>.md` with the full tag list if you need more.

### Removal
By target type:
- `removal-creature`, `removal-artifact`, `removal-enchantment`, `removal-planeswalker`
- `removal-land`, `removal-permanent`, `removal-noncreature`, `removal-nonland`, `removal-nonenchantment`

By mechanism:
- `removal-destroy`, `removal-exile`, `removal-bounce`, `removal-tuck`, `removal-sacrifice`
- `removal-burn`, `removal-fight`, `removal-bite`, `removal-toughness`

Mass / multi-target:
- `boardwipe`, `expansion-sweeper`, `wrath-of-god`

Classic single-target patterns:
- `doom-blade`, `edict`, `artifact-removal`, `abrade`, `beast-within`

Note: `removes-*` is for **stripping keywords** (e.g. `removes-flying`, `removes-trample`, `removes-indestructible`, `removes-hexproof`) — not for removing permanents.

### Counterspells
- `counterspell-noncreature`, `counterspell-creature`, `counterspell-instant`, `counterspell-artifact`, `counterspell-enchantment`, `counterspell-planeswalker`, `counterspell-battle`, `counterspell-aura`
- `counterspell-ability`, `counterspell-loyalty-ability` — counter activated/triggered abilities
- `counterspell-free`, `counterspell-reusable`, `counterspell-automatic`
- `counterspell-bounce`, `counterspell-exile`, `counterspell-sacrifice` — by side effect
- `counter-fuel`, `counter-fuel-*` — cards that fuel counter-themed decks

### Tutors
By card type:
- `tutor-creature`, `tutor-land`, `tutor-land-basic`
- `tutor-instant`, `tutor-sorcery`, `tutor-artifact`, `tutor-enchantment`
- `tutor-noncreature`, `tutor-nonland`, `tutor-any` — generic tutors

By card-attribute:
- `tutor-cmc`, `tutor-mv` — by mana value
- `tutor-color`, `tutor-black`, `tutor-blue`, `tutor-red`, `tutor-green`, `tutor-white` — by color
- `tutor-monocolored`, `tutor-multicolored` — by color count
- `tutor-flash`, `tutor-flashback`, `tutor-legendary` — by keyword/supertype

By destination:
- `tutor-hand`, `tutor-totop` (top of library), `tutor-battlefield`, `tutor-exile`, `tutor-sideboard`

Famous one-off named tutors:
- `demonic-tutor`, `booster-tutor`, `entomb`, `self-tutor`

See `reference/tutors.md` for all 179 variants — there's `tutor-<type>-<subtype>` granularity for nearly every creature subtype.

### Ramp & Mana Fixing
- `acceleration` — fast mana production
- `mana-rock`, `mana-dork` — artifact and creature ramp
- `adds-multiple-mana` — produces 2+ mana per cast
- `dual-land`, `fetchland`, `filterland`, `bounceland`, `creatureland`
- `explosive-vegetation` — search multiple basics

### Card Draw & Selection
- `draw`, `draw-card`, `draw-engine`, `draw-to-seven` — bread-and-butter draw
- `cantrip` — small effect plus draw a card
- `bottle-draw`, `burst-draw`, `catalog`, `extract` — variations
- `impulse`, `impulse-creature`, `impulse-instant`, `impulse-sorcery`, `impulse-color`, etc. — exile and may cast
- `rummage`, `repeatable-rummage`, `rummage-to-library` — draw then discard
- `discard-outlet`, `discard-outlet-*`, `free-discard-outlet` — places to dump cards
- `wheel`, `wheel-one-sided`, `wheel-symmetrical` — discard hand, draw N
- `brainstorm`, `fact-or-fiction`, `compulsive-research` — famous named patterns
- `drawlink` — card draw tied to another effect

### Recursion & Graveyard
- `reanimate-creature` — return creature from yard to play
- `regrowth-instant`, `regrowth-sorcery`, `regrowth-permanent` — yard to hand
- `restock-*` — yard to library
- `entomb` — put a card directly into your yard
- `graveyard-hate` — exile / shuffle opponents' yards
- `delve` — exile from yard to cast

### Ability Grants & Anthems
- `gives-flying`, `gives-haste`, `gives-trample`, `gives-lifelink`
- `gives-deathtouch`, `gives-indestructible`, `gives-hexproof`, `gives-ward`
- `gives-vigilance`, `gives-menace`, `gives-double-strike`
- `anthem` — static +X/+X buffs to a group

### Token Producers
- `creates-card-token`, `creates-oracle-token`, `creates-token-of-a-card` — copy-effects that produce token copies
- `creates-multiple-enchantment` — enchantment-token producers
- `animate-token`, `copy-token` — interact with existing tokens
- `affinity-for-tokens` — token-count payoff
- `conjure`, `conjure-creature`, `conjure-artifact`, `conjure-enchantment`, `conjure-instant`, `conjure-land`, etc. — Alchemy conjure effects

Note: Scryfall doesn't tag every "creates an X token" card with a `creates-*` tag — most token producers are findable via card type (`oracle:"create" oracle:"token"` or by token subtype `t:token t:treasure`). The functional tag is more useful for the *unusual* cases (copying, conjuring, etc.).

### Tribal / Typal Payoffs
- Pattern: `typal-<tribe>` or `tribal-<tribe>` (e.g., `typal-elf`, `tribal-goblin`, `typal-zombie`, `typal-vampire`, `typal-dragon`, `typal-merfolk`, `typal-soldier`, `typal-spirit`, `typal-wizard`)
- `affinity-for-creature-type` — generic typal cost reduction
- See `reference/tribal-typal.md` for the full 400+ list

### Affinity & Cost Reduction
- `affinity-for-artifacts`, `affinity-for-creatures`, `affinity-for-enchantments`, `affinity-for-spells`, `affinity-for-spells-in-graveyard`
- `affinity-for-graveyard`, `affinity-for-attacking`, `affinity-for-tokens`, `affinity-for-domain`
- `affinity-for-creature-type`, `affinity-for-land-type` — generic typal/landtype reductions
- `cost-reducer`, `cost-reducer-creature`, `cost-reducer-instant`, `cost-reducer-sorcery`, `cost-reducer-instant-sorcery`, `cost-reducer-artifact`, `cost-reducer-equipment`, `cost-reducer-legendary`, `cost-reducer-historic`
- `cost-reducer-noncreature`, `cost-reducer-nonland` — broad categories
- `convoke`, `delve`, `improvise` — alternate cost keywords

### Protection
- `prevent-damage` — damage prevention
- `gives-hexproof`, `gives-indestructible`, `gives-ward` — grants
- `circle-of-protection` — color-specific prevention

### Theft & Borrow
- `theft-creature`, `theft-permanent` — steal opponents' stuff
- `borrow-ability` — temporary "until end of turn" control
- `bribery` — cast from opponents' libraries

### Copy & Clone
- `clone` — copy a creature permanently
- `copy-spell` — fork a spell
- `copy-permanent`, `copy-artifact`

## Themes (cross-cutting axes)

The category reference files organize tags by **primary mechanical role** — each tag lives in one place. But tags also carry orthogonal *themes*: `repeatable-lifegain` is both an engine pattern AND a lifegain payoff. Theme files cross-reference every tag relevant to a deck-building theme regardless of which category it's filed under.

Each `themes/<theme>.md` lists every matching tag grouped by its primary category.

| Theme file | What it covers |
|------------|----------------|
| `themes/lifegain.md` | Lifegain, lifelink, life-payment effects |
| `themes/sacrifice.md` | Sacrifice as cost / ability / payoff |
| `themes/counters.md` | +1/+1 and other permanent counters (not counterspells) |
| `themes/discard.md` | Discard costs, outlets, payoffs |
| `themes/mill.md` | Mill effects |
| `themes/damage.md` | Direct damage and burn |
| `themes/tokens-broad.md` | Anything touching tokens (broader than the tokens category) |
| `themes/graveyard-broad.md` | All graveyard-interacting tags |
| `themes/exile-zone.md` | Exile-zone interactions |
| `themes/spells-matter.md` | Instants/sorceries matter |
| `themes/artifacts-matter.md` | Artifact-matters tags |
| `themes/enchantments-matter.md` | Enchantment/aura/saga matters |
| `themes/equipment.md` | Equipment matters |
| `themes/vehicles.md` | Vehicles and crew |
| `themes/legendary-matters.md` | Legendary / historic matters |
| `themes/etb.md` | Enters-the-battlefield triggers |
| `themes/death-triggers.md` | Dies / leaves-battlefield triggers |
| `themes/attack-combat.md` | All combat-touching tags (attack, block, combat phase) |
| `themes/planeswalker-matters.md` | Planeswalker / loyalty matters |
| `themes/color-matters.md` | Color identity, devotion, mono/multicolor matters |
| `themes/commander-format.md` | Commander-specific cards |
| `themes/self-only.md` | "Self" versions of effects (only your stuff) |
| `themes/food-treasure-tokens.md` | Specific token types (food, treasure, clue, etc.) |
| `themes/alternate-zones.md` | Cast/activate from non-hand zones |
| `themes/triggers-broad.md` | All triggered-ability tags |
| `themes/ramp-broad.md` | All mana-producing tags |
| `themes/activate-from-zone.md` | Activated abilities from non-hand zones |
| `themes/removes-keyword.md` | Strips keyword abilities |
| `themes/repeatable.md` | Repeatable-engine variants |

## Programmatic access

For structured lookup beyond what these markdown files support, two artifacts:

### `tag-index.json`
Structured metadata for every tag:
```json
{
  "tags": {
    "repeatable-lifegain": {
      "categories": ["engines-repeatable"],
      "themes": ["lifegain", "repeatable"],
      "words": ["repeatable", "lifegain"]
    }
  }
}
```

### `scripts/search.py`
CLI for querying the index. Composable filters (substring, theme, category, word, not-word).

```bash
# Substring search
python scripts/search.py lifegain

# All tags in a theme
python scripts/search.py --theme lifegain

# Intersection: theme AND category
python scripts/search.py --theme lifegain -c engines-repeatable

# Word match with exclusion
python scripts/search.py --word counter --not-word counterspell

# Discoverability
python scripts/search.py --list-themes
python scripts/search.py --list-categories

# Verbose output with category + theme metadata per tag
python scripts/search.py --theme lifegain -v
```

### `scripts/build.py`
Regenerates `tag-index.json` and the `themes/` files from `reference/full-tags.json`. Run after re-scraping or after editing the category/theme rule definitions inside `build.py`.

## Reference files (load on demand)

Read these when you need the full enumeration of a category, not just the curated picks above.

| File | Tag count | What it covers |
|------|-----------|----------------|
| `reference/removal.md` | 55 | All removal variants and adjacent tags |
| `reference/counterspells.md` | 46 | `counter-*` and `counterspell-*` |
| `reference/tutors.md` | 179 | Every `tutor-*` slug |
| `reference/ramp-fixing.md` | 39 | `mana-*` plus ad-hoc ramp tags |
| `reference/card-draw.md` | 116 | Draw, dig, filter, loot |
| `reference/recursion-graveyard.md` | 88 | `reanimate-*`, `regrowth-*`, `restock-*`, graveyard themes |
| `reference/ability-grants.md` | 209 | `gives-*` and `gains-*` |
| `reference/tokens.md` | 65 | Token producers across all types |
| `reference/tribal-typal.md` | 440 | Full typal / tribal payoff list |
| `reference/tribal-hate.md` | 174 | Anti-tribe sideboard cards (`hate-typal-*`, `hate-tribal-*`) |
| `reference/hate.md` | 147 | General hate (`hate-artifact`, `hate-graveyard`, etc.) |
| `reference/affinity-cost-reduction.md` | 56 | Affinity and cost reducers |
| `reference/synergy.md` | 279 | `synergy-*` tags |
| `reference/cycles.md` | 1,736 | Set-specific reprint cycles (`cycle-clb-*`, `cycle-iko-*`, etc.) — niche but useful for design/historical work |
| `reference/lands.md` | 210 | Lands beyond simple ramp: utility, manlands, fetch targets |
| `reference/combat.md` | 26 | Combat triggers, blockers, declaration effects |
| `reference/animate-effects.md` | 14 | Animate non-creature permanents |
| `reference/alternate-costs.md` | 10 | Non-mana alternate cast costs |
| `reference/alt-wincons.md` | 3 | Alternate win/loss conditions |
| `reference/cast-from-zones.md` | 16 | Cast / activate from non-hand zones |
| `reference/bounce-blink.md` | 7 | Bounce and flicker effects |
| `reference/burn-damage.md` | 18 | Direct damage spells |
| `reference/triggered-abilities.md` | 10 | Cast / attack / block triggers by source |
| `reference/counters.md` | 63 | +1/+1, charge, and other permanent counters |
| `reference/color-identity.md` | 20 | Color-changing, mono-color effects, color hate |
| `reference/copy-clone.md` | 21 | Copy spells and permanents |
| `reference/protection.md` | 16 | Prevention and protection-granting |
| `reference/theft.md` | 23 | Steal and borrow effects |
| `reference/engines-repeatable.md` | 33 | `repeatable-*` versions of one-shot effects |
| `reference/matters.md` | 121 | "X matters" themes |
| `reference/signposts.md` | 96 | Multicolor draft signposts and pair markers |
| `reference/type-changes.md` | 44 | Type-line errata and on-the-fly type changes |
| `reference/joke-and-flavor.md` | 15 | Joke tags and flavor curation |
| `reference/long-tail.md` | 1,180 | Alphabetical dump of standalone tags that didn't match a curated category — grep this if a tag you expect doesn't appear above |
| `reference/full-tags.json` | 5,232 | Raw scrape, organized by letter, for programmatic access |

## Tips for searching

1. **When in doubt, search by category.** `function:removal-creature` will find more than 800 cards across every printing — a much wider net than oracle text searches for "destroy target creature."
2. **Combine `function:` with format and color filters** to scope to your deck: `function:tutor-creature f:commander id<=wug mv<=3`.
3. **Tags compound with negation.** `function:ramp -function:land` finds non-land ramp.
4. **Several tags can be true at once.** `function:reanimate-creature function:repeatable` finds repeatable reanimation engines like Sheoldred, Whispering One.
5. **For unfamiliar tags**, just paste the URL: `https://scryfall.com/search?q=function%3A<tag>` shows what actually matches — your best ground-truth check.

## See also

- **scryfall-search** — operator grammar (`c:`, `t:`, `mv`, `f:`, `id:`, …) for combining `function:` tags with the rest of a query.
