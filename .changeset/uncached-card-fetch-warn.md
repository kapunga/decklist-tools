---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

`deck_list`, `deck_curve` and `deck_pull_list` now fetch cards missing from the Scryfall cache before rendering and write them to the cache. If a card still can't be resolved, the view names it in a warning. It is no longer reported at mana value 0, and `deck_curve` leaves it out of the curve and pips and says how many cards it left out.
