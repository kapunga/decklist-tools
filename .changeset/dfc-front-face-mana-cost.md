---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Show the front-face mana cost of double-faced cards (transform, modal DFC) in `deck_list`, `deck_pull_list` and `search_cards`, and count their pips in `deck_curve`, via a shared `getCardManaCost` accessor
