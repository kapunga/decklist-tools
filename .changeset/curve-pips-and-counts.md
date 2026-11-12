---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix `deck_curve` mana pips and card counts: generic mana is reported on its own `Generic` line instead of as Colorless, real `{C}` symbols are counted, hybrid/twobrid/Phyrexian symbols are handled, and the card counts now add up (commanders listed separately; filtered output counts only the matching cards and says so). The Electron curve's colorless pip bar now shows only real `{C}` pips.
