---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add filter controls to the deck list page.

The deck list header now AND-combines four filters:

- **Search** (existing) — matches deck name and archetype.
- **Format** — `Select` dropdown over All / Commander / Standard / Pioneer / Modern / Legacy / Pauper / Kitchen Table.
- **Status** — segmented control for All / Complete / Incomplete. *Complete* is derived from `getCardCount(deck) === deck.format.deckSize` (no schema change).
- **Color identity** — checklist of WUBRG mana pips plus a colorless pip.

### Color filter behavior

Each WUBRG pip cycles through three states on successive clicks: **off → required → excluded → off**. Required pips render at full opacity; excluded pips render at full opacity with a diagonal red strike-through (drawn via a CSS linear-gradient using the theme's `--destructive` token, so the strike retunes per theme). Multiple selections AND together — for example, requiring G and excluding B shows green decks that don't include black.

The colorless (C) pip is binary on/off and mutually exclusive with WUBRG state. Clicking it clears any WUBRG filter and shows only decks with empty color identity; clicking a WUBRG pip while colorless is active swaps modes (colorless cleared, that color set to *required*).

All filter state is local to `DeckList` — these are view settings, not deck data, and reset on navigation away.
