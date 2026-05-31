"""Regenerate derived skill data from reference/full-tags.json.

Produces:
  - tag-index.json     : structured metadata per tag (categories, themes, words)
  - themes/<theme>.md  : one human-readable file per cross-cutting theme

Run from anywhere; paths are resolved relative to this script.

Usage: python scripts/build.py
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Callable

HERE = Path(__file__).resolve().parent
SKILL_ROOT = HERE.parent
SRC = SKILL_ROOT / "reference" / "full-tags.json"
INDEX_OUT = SKILL_ROOT / "tag-index.json"
THEMES_DIR = SKILL_ROOT / "themes"


Rule = Callable[[str], bool]


def prefix(*prefixes: str) -> Rule:
    return lambda t: any(t == p or t.startswith(p + "-") for p in prefixes)


def in_set(*tags: str) -> Rule:
    s = set(tags)
    return lambda t: t in s


def contains(*substrings: str) -> Rule:
    return lambda t: any(s in t for s in substrings)


def has_word(*words: str) -> Rule:
    """Match if any of the given words appears as a whole hyphen-separated token."""
    target = set(words)
    return lambda t: bool(target & set(t.split("-")))


def either(*rules: Rule) -> Rule:
    return lambda t: any(r(t) for r in rules)


def both(*rules: Rule) -> Rule:
    return lambda t: all(r(t) for r in rules)


def not_(rule: Rule) -> Rule:
    return lambda t: not rule(t)


# ---------------------------------------------------------------------------
# Categories: a tag's "primary mechanical role". Strict tree-style bucketing.
# ---------------------------------------------------------------------------
CATEGORIES: list[tuple[str, str, str, Rule]] = [
    ("removal", "Removal",
     "Spells and abilities that destroy, exile, bounce, or otherwise neutralize permanents.",
     either(prefix("removal", "removes"),
            in_set("artifact-removal", "boardwipe", "doom-blade", "edict",
                   "expansion-sweeper", "abrade", "arrest", "beast-within",
                   "wrath-of-god"))),
    ("counterspells", "Counterspells",
     "Cards that counter spells or abilities on the stack.",
     prefix("counter", "counterspell")),
    ("tutors", "Tutors",
     "Effects that search a library or zone for a specific card.",
     either(prefix("tutor"), in_set("booster-tutor", "demonic-tutor", "entomb"))),
    ("ramp-fixing", "Ramp & Mana Fixing",
     "Acceleration, dual lands, fetches, and mana production.",
     either(prefix("mana", "ramp", "fixing"),
            in_set("acceleration", "dual-land", "fetchland", "filterland",
                   "depletion-land", "boltland", "bounceland", "creatureland",
                   "explosive-vegetation", "abu-dual-land", "adds-multiple-mana",
                   "fast-mana", "mana-rock", "mana-dork"))),
    ("card-draw", "Card Draw & Selection",
     "Effects that draw cards, dig into the library, or filter draws.",
     either(prefix("impulse", "draw", "seek", "rummage"),
            in_set("cantrip", "brainstorm", "burst-draw", "bottle-draw",
                   "compulsive-research", "drawlink", "fact-or-fiction",
                   "wheel", "wheel-one-sided", "wheel-symmetrical",
                   "catalog", "extract"))),
    ("recursion-graveyard", "Recursion & Graveyard",
     "Returning cards from the graveyard or otherwise interacting with the yard as a resource.",
     either(prefix("reanimate", "regrowth", "restock", "graveyard"),
            in_set("entomb", "delve", "exhume", "mill", "self-mill"))),
    ("ability-grants", "Ability Grants & Anthems",
     "Effects that give creatures keywords, +X/+X buffs, or other abilities.",
     either(prefix("gives", "gains"),
            in_set("anthem", "ethereal-armor", "battle-cry"))),
    ("tokens", "Token Producers",
     "Cards that create creature, artifact, or other tokens.",
     either(contains("-token", "-tokens"),
            prefix("conjure", "embalm"),
            in_set("artifactify", "auraify", "enchantmentize"))),
    ("tribal-typal", "Tribal / Typal Payoffs",
     "Cards that care about creature types.",
     prefix("tribal", "typal")),
    ("tribal-hate", "Tribal Hate",
     "Cards specifically punishing decks of a creature type.",
     prefix("hate-typal", "hate-tribal")),
    ("hate", "General Hate Cards",
     "Sideboard-style cards punishing specific strategies or zones.",
     lambda t: t.startswith("hate-") and not t.startswith("hate-typal") and not t.startswith("hate-tribal")),
    ("affinity-cost-reduction", "Affinity & Cost Reduction",
     "Cards that get cheaper based on board state.",
     either(prefix("affinity", "cost-reducer", "cost"),
            in_set("convoke", "delve", "improvise"))),
    ("synergy", "Synergy Tags",
     "Tags noting that a card synergizes with a particular mechanic.",
     prefix("synergy")),
    ("cycles", "Set Cycles",
     "Tags for reprint / design cycles within a single set or block.",
     prefix("cycle")),
    ("lands", "Land Types & Effects",
     "Tags about lands beyond simple ramp.",
     either(contains("-land", "land-"),
            in_set("fetchland", "filterland", "depletion-land", "boltland",
                   "bounceland", "creatureland", "abu-dual-land", "dual-land"))),
    ("combat", "Combat & Attacking",
     "Damage tricks, combat triggers, evasion, blockers.",
     either(prefix("attack", "block", "combat", "attacking", "blocking"),
            in_set("battle-cry", "berserk", "evasion", "fake-flying",
                   "battalion", "ferocious", "exalted", "boast", "raid",
                   "rally", "myriad-like", "double-strike-like", "combat-trick"))),
    ("animate-effects", "Animate Effects",
     "Cards that turn non-creature permanents into creatures.",
     either(prefix("animate"), in_set("creatureland", "manland"))),
    ("alternate-costs", "Alternate Costs",
     "Cards with non-mana alternate costs.",
     either(prefix("alternate-cost", "alt-cost", "alternative"),
            in_set("alternate-equip-cost", "alternative-crewing", "cast-tax"))),
    ("alt-wincons", "Alternate Win & Loss Conditions",
     "Cards with non-combat victory conditions or unusual loss conditions.",
     either(prefix("alternate-win", "alternate-loss"),
            in_set("automatic-win"))),
    ("cast-from-zones", "Cast / Activate from Non-Hand Zones",
     "Effects that let you cast or activate cards from exile, graveyard, library.",
     either(prefix("cast-from", "castable-from", "activate-from"),
            in_set("cheat-into-play", "cheat-mana"))),
    ("bounce-blink", "Bounce & Blink",
     "Returning permanents to hand, flickering.",
     either(prefix("bounce", "blink"),
            in_set("flicker", "flicker-self", "exiles-self"))),
    ("burn-damage", "Burn & Direct Damage",
     "Damage spells targeting creatures, players, or planeswalkers.",
     either(prefix("burn", "bombard"),
            in_set("ball-lightning", "arc-lightning", "bomb"))),
    ("triggered-abilities", "Triggered Abilities by Source",
     "Tags for triggers based on cast events, combat phases, etc.",
     prefix("cast-trigger", "attack-trigger", "block-trigger", "death-trigger",
            "etb-trigger", "ltb-trigger")),
    ("counters", "Counters (on permanents)",
     "Tags for cards interacting with permanent counters.",
     lambda t: ("counter" in t and "counterspell" not in t and not t.startswith("counter-"))),
    ("color-identity", "Color & Color Identity",
     "Cards that interact with color.",
     either(prefix("color", "colorless", "monocolor"),
            in_set("black-effect", "black-hate", "blue-effect", "blue-hate",
                   "red-effect", "red-hate", "green-effect", "green-hate",
                   "white-effect", "white-hate"))),
    ("copy-clone", "Copy & Clone Effects",
     "Cards that copy spells or permanents.",
     either(prefix("copy"), in_set("clone"))),
    ("protection", "Protection & Prevention",
     "Hexproof, indestructible grants, damage prevention.",
     either(prefix("prevent"), in_set("indestructibility", "hexproof-grant", "ward-grant"))),
    ("theft", "Theft & Borrow",
     "Cards that take control of opponents' permanents.",
     either(prefix("theft", "borrow"), in_set("bribery"))),
    ("engines-repeatable", "Repeatable Engines",
     "Tags marking 'repeatable' versions of one-shot effects.",
     prefix("repeatable")),
    ("matters", "'X Matters' Themes",
     "Cards that care about a specific characteristic.",
     lambda t: t.endswith("-matters") or t.endswith("-matter")),
    ("signposts", "Draft Signposts & Multicolor Markers",
     "Multicolor signpost cards from draft sets.",
     either(contains("signpost"), in_set("two-color", "tricolor", "five-color"))),
    ("type-changes", "Type Changes & Errata",
     "Tags for type-line errata and on-the-fly type changes.",
     either(prefix("type-errata"), contains("becomes-"), in_set("counts-as-a-type"))),
    ("joke-and-flavor", "Joke & Flavor Tags",
     "Tags that exist as jokes or for flavor curation.",
     in_set("buttbreathing", "buttcrew", "buttfight", "buttfling",
            "buttlink", "buttsaddle", "buttstation", "buttstrike",
            "bible-reference", "art-matters", "artist-matters",
            "anagram", "alliteration", "cover-card", "checklist-card")),
]


# ---------------------------------------------------------------------------
# Themes: cross-cutting axes. A tag can have multiple themes.
# ---------------------------------------------------------------------------
THEMES: list[tuple[str, str, str, Rule]] = [
    ("lifegain", "Lifegain & Lifelink",
     "Tags about gaining life, lifelink, or caring about life total.",
     either(contains("lifegain", "lifelink", "lifesteal"),
            has_word("life"))),
    ("sacrifice", "Sacrifice",
     "Sacrifice as a cost, ability, or payoff.",
     either(contains("sacrifice", "devour"), has_word("sac"))),
    ("counters", "+1/+1 & Other Counters",
     "Cards producing or caring about counters (NOT counterspells).",
     both(contains("counter"),
          lambda t: "counterspell" not in t and not t.startswith("counter-"))),
    ("discard", "Discard",
     "Discard as cost, ability, or theme (includes looting/rummaging).",
     either(contains("discard"), contains("rummage"))),
    ("mill", "Mill",
     "Putting cards from library directly into graveyard.",
     contains("mill")),
    ("damage", "Direct Damage & Burn",
     "Dealing damage to creatures, players, or planeswalkers.",
     either(has_word("burn", "damage", "bolt", "bombard", "ping"),
            in_set("arc-lightning", "ball-lightning"))),
    ("tokens-broad", "Tokens (broad)",
     "Anything touching tokens — producers, payoffs, consumers.",
     contains("token")),
    ("graveyard-broad", "Graveyard (broad)",
     "Any tag interacting with the graveyard as a resource or zone.",
     either(contains("graveyard", "reanimate", "regrowth", "restock", "delve"),
            has_word("yard", "dies"))),
    ("exile-zone", "Exile Zone",
     "Tags interacting with the exile zone.",
     contains("exile")),
    ("spells-matter", "Spells Matter",
     "Cards that care about casting instants and sorceries.",
     either(has_word("spell", "instant", "sorcery", "spellslinger"),
            contains("noncreature-spell"))),
    ("artifacts-matter", "Artifacts Matter",
     "Cards that care about artifacts.",
     contains("artifact")),
    ("enchantments-matter", "Enchantments Matter",
     "Cards that care about enchantments and auras.",
     either(contains("enchantment"), has_word("aura", "saga"))),
    ("equipment", "Equipment",
     "Equipment-related tags.",
     either(contains("equipment"), has_word("equip"))),
    ("vehicles", "Vehicles & Crew",
     "Vehicle and crew-related tags.",
     either(contains("vehicle"), has_word("crew", "pilot"))),
    ("legendary-matters", "Legendary Matters",
     "Cards that care about legendary status or historic spells.",
     either(has_word("legendary", "legend", "historic"))),
    ("etb", "Enters the Battlefield",
     "ETB triggers and effects.",
     either(has_word("etb", "enters", "etb-trigger"), contains("enters"))),
    ("death-triggers", "Death Triggers",
     "Triggers when creatures die.",
     either(has_word("death", "dies", "ltb"), contains("death-trigger"))),
    ("attack-combat", "Attack & Combat (broad)",
     "Anything touching combat phase, attacks, or blockers.",
     either(has_word("attack", "attacking", "combat", "block", "blocking", "blocker"),
            contains("combat"))),
    ("planeswalker-matters", "Planeswalker Matters",
     "Cards that care about planeswalkers.",
     either(contains("planeswalker"), has_word("loyalty", "pw"))),
    ("color-matters", "Color & Devotion",
     "Color identity, devotion, monocolor and multicolor matters.",
     either(has_word("devotion", "monocolor", "monocolored", "multicolored", "hybrid"),
            contains("color"))),
    ("commander-format", "Commander Format",
     "Cards specifically designed for Commander.",
     contains("commander")),
    ("self-only", "Self-Only Effects",
     "Tags marking 'self' versions of effects (only affect you/your stuff).",
     lambda t: t.endswith("-self") or t.endswith("-yourself")),
    ("food-treasure-tokens", "Food, Treasure & Other Specific Tokens",
     "Specific token types (food, treasure, clue, blood, map, gold, powerstone, etc.).",
     contains("food", "treasure", "clue", "blood-token", "map-token",
              "gold-token", "powerstone", "junk-token", "incubator")),
    ("alternate-zones", "Alternate Casting Zones",
     "Cast or activate from non-hand zones (exile, graveyard, library, top of deck, command zone).",
     either(prefix("cast-from", "castable-from", "activate-from"),
            in_set("cheat-into-play"))),
    ("triggers-broad", "Triggered Abilities (broad)",
     "Any tag mentioning a trigger condition.",
     contains("trigger")),
    ("ramp-broad", "Ramp & Mana Production (broad)",
     "Anything producing or accelerating mana — overlaps with ramp-fixing category.",
     either(contains("mana"), has_word("ramp", "fixing"))),
    ("activate-from-zone", "Activated Abilities from Non-Hand Zones",
     "Abilities activatable from exile, graveyard, command zone, or stack.",
     prefix("activate-from")),
    ("removes-keyword", "Removes Keyword Abilities",
     "Tags for stripping keywords from creatures (removes-flying, removes-trample, etc.).",
     prefix("removes")),
    ("repeatable", "Repeatable Engines",
     "Repeatable versions of one-shot effects.",
     prefix("repeatable")),
]


# ---------------------------------------------------------------------------
def main() -> None:
    raw = json.loads(SRC.read_text())
    all_tags = sorted({t for v in raw.values() for t in v})

    # Build per-tag metadata
    index: dict[str, dict] = {}
    for tag in all_tags:
        index[tag] = {
            "categories": [slug for slug, _t, _d, r in CATEGORIES if r(tag)],
            "themes": [slug for slug, _t, _d, r in THEMES if r(tag)],
            "words": [w for w in tag.split("-") if w],
        }

    # Write JSON index
    payload = {
        "metadata": {
            "source": "https://scryfall.com/docs/tagger-tags",
            "total_tags": len(all_tags),
            "category_count": len(CATEGORIES),
            "theme_count": len(THEMES),
        },
        "categories": {slug: {"title": title, "description": desc}
                       for slug, title, desc, _r in CATEGORIES},
        "themes": {slug: {"title": title, "description": desc}
                   for slug, title, desc, _r in THEMES},
        "tags": index,
    }
    INDEX_OUT.write_text(json.dumps(payload, indent=2))

    # Write theme files
    THEMES_DIR.mkdir(parents=True, exist_ok=True)
    # Index of categories per tag, used to group within each theme file
    cat_titles = {slug: title for slug, title, _d, _r in CATEGORIES}
    cat_titles[None] = "Uncategorized"

    for slug, title, desc, _rule in THEMES:
        members = [t for t in all_tags if slug in index[t]["themes"]]
        # Group members by their primary category (first category, or None)
        by_cat: dict[str | None, list[str]] = defaultdict(list)
        for t in members:
            cats = index[t]["categories"]
            primary = cats[0] if cats else None
            by_cat[primary].append(t)

        path = THEMES_DIR / f"{slug}.md"
        with path.open("w") as f:
            f.write(f"# {title}\n\n")
            f.write(f"{desc}\n\n")
            f.write(f"**Tag count:** {len(members)}\n\n")
            f.write("Cross-references tags that match the theme, grouped by their primary mechanical category.\n\n")
            for cat_slug in sorted(by_cat, key=lambda x: (x is None, x or "")):
                f.write(f"## {cat_titles.get(cat_slug, cat_slug)}\n\n")
                for t in sorted(by_cat[cat_slug]):
                    f.write(f"- `{t}`\n")
                f.write("\n")

    # Summary
    print(f"Tags processed: {len(all_tags)}")
    print(f"Categories:     {len(CATEGORIES)}")
    print(f"Themes:         {len(THEMES)}")
    print(f"Wrote: {INDEX_OUT.relative_to(SKILL_ROOT)}")
    print(f"Wrote: {THEMES_DIR.relative_to(SKILL_ROOT)}/*.md ({len(THEMES)} files)")
    print()
    print("Theme membership counts:")
    for slug, _title, _desc, _rule in THEMES:
        n = sum(1 for t in all_tags if slug in index[t]["themes"])
        print(f"  {slug:25s}  {n:5d}")


if __name__ == "__main__":
    main()
