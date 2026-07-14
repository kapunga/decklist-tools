---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix `validateCardLimits` flagging legal decks as invalid because it counted copies across `alternates` (a consideration list, not part of the deck under format rules) alongside mainboard and sideboard. It also missed a card that appears both as a commander and in the mainboard, which should trip the singleton limit but previously didn't since commanders live outside `cardSets`. The check is now scoped to mainboard + sideboard + commanders.
