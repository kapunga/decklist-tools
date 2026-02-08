---
"@mtg-deckbuilder/electron-app": patch
---

Add separator between mana costs for double-faced cards in Pull List

- Double-faced cards now display both faces' mana costs with a `//` separator
- For example, "Delver of Secrets" shows `{U} // {U}` instead of just `{U}`
