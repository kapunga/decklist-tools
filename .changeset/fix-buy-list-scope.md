---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix the Buy List view only showing "need to buy" cards from a deck's mainboard. `useBuyList` scanned `getMainboard(deck)`, so cards flagged `need_to_buy` in the `alternates` or `sideboard` sets — where this ownership tag is actually used most often — never appeared. It now scans `getNonCutEntries(deck)` (mainboard + sideboard + alternates, excluding the cut pile), matching the scope `DeckStats` already uses for its own "cards needing purchase" count.
