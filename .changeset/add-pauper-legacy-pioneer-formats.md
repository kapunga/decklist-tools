---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add game-format support for Pauper, Legacy, and Pioneer.

Refactors card-intrinsic deck limits (Seven Dwarves, Nazgûl, Relentless Rats, etc.)
out of each `DeckFormat` into a module-level in-memory map loaded on boot from
Scryfall's `o:"A deck can have"` query. Disk-cached for 24h with an offline
fallback, so validation works even before the first successful network fetch.

Migration 005 strips the now-unused `unlimitedCards` and `specialLimitCards`
fields from saved deck files on next load.

Also fixes three latent bugs surfaced during the refactor:
- `manage_deck update` now honors the `format` field (previously silently dropped).
- `manage_commander` uses the new `isCommanderLikeFormat` helper so future
  commander-zone formats route correctly without a second edit.
- The deck list in the Electron app now scrolls when its content overflows.
