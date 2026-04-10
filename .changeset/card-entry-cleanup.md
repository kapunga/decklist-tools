---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

CardEntry cleanup: tighten the type, replace `inclusion` with set membership, and fix the "cut all my Islands" bug

**The bug fix.** The MCP `manage_card` move action no longer silently moves an entire stack when the agent meant a single card. When the source entry has more than one copy, an explicit `quantity` is now required — agents that say "cut Lightning Bolt" in commander still work (singletons), but "cut Island" fails loudly until the agent commits to a number.

**`cut` is a real CardSet now.** Replaces the per-card `inclusion === 'cut'` flag with `cardSets[].name === 'cut'`. Cut cards live in their own holding pen, can carry notes explaining why they were cut, and are excluded from deck-size validation, color identity, and pull lists. The `manage_card` move action's `from`/`to` enums now accept `cut` as a value. Same for `considering` cards, which now live in `alternates` (the existing structural equivalent).

**`CardEntry` is tighter.** `quantity`, `roles`, `source`, and `ownership` are now required (with sensible defaults via the new `makeCardEntry` factory). `inclusion`, `isPinned`, and the denormalized `typeLine` are gone. Type lines are now read on-demand from the Scryfall cache via the new `getTypeLine(entry, cache)` accessor — no more drift between stored and cached values.

**MCP tool surface changes:**
- `manage_card` lost the `status` argument (replaced by set membership via `move`).
- `manage_card`'s `move` action gained `cut` as a valid `from`/`to` value, and now requires explicit `quantity` for multi-copy sources.
- `manage_card` lost the `pinned` argument.
- New tool reference doc at `specs/02-mcp-server.md`.

**On-disk migrations** (run automatically on next deck load):
- Migration 003 backfills `roles`/`source`/`quantity`/`ownership` defaults, strips `isPinned`, converts `inclusion === 'cut'` entries into the new `cut` set, and converts `inclusion === 'considering'` entries into `alternates`.
- Migration 004 strips the denormalized `typeLine` field.
- Both are idempotent and merge duplicate entries when set membership changes produce them.

**Internal cleanup** (no user-visible behavior change):
- Added `getCutList`, `getNonCutEntries`, `getTypeLine`, `getPulledPrintings`, `getPotentialDecks` accessors in shared.
- Added `makeCardEntry` factory for centralized default handling.
- Removed scattered `?? defaultValue` coalescing now that the type system enforces required fields.
- Removed the `INCLUSION_STATUS` constant and `InclusionStatus` type (orphaned).
- Rewrote validators, filters, format parsers, and views to read fields directly or via accessors instead of defending against undefined.
- Collapsed the `### Confirmed` / `### Considering` subheadings in the full-view output (the structural separation of mainboard / alternates conveys the same intent).
