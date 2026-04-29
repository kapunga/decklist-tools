---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix two critical deck-modification bugs.

### Cards added through the Add Card modal silently disappeared

The Mainboard radio in `CardAddModal` had `value="cards"` while the
destination state was initialized to `CARD_SET.MAINBOARD` (`"mainboard"`).
The mismatch left no radio visually selected when the modal opened —
prompting users to click the apparently-empty Mainboard option, which
flipped the destination to `"cards"`. The card was then routed to a
phantom set named `"cards"` (created on demand by `withDeckCardSet`)
that no UI tab displayed, so the add appeared to silently fail.

Fixed by binding all three radio values to the `CARD_SET` constants
(`MAINBOARD` / `SIDEBOARD` / `ALTERNATES`). Existing decks with phantom
`"cards"` sets are not migrated — those sets stay in the JSON but remain
invisible. They can be cleaned up later if any are found.

### No way to set a commander in the UI

`SelectCommanderModal` was fully implemented but imported nowhere — the
deck-detail header only displayed a commander when one was already set
(via import or hand-edited JSON), with no affordance to set or change
one. Users creating a fresh commander deck through the New Deck flow
had no path to attach a commander.

Fixed by wiring `SelectCommanderModal` into `DeckDetail`'s header for
commander-like formats:

- When `commanders.length === 0`: a **Set Commander** button opens the
  modal.
- When a commander exists: a small pencil button next to the commander
  name opens the modal in swap mode, constrained to the current color
  identity so the swap can't silently invalidate existing cards.
- When the existing commander has the **Partner** keyword and there's
  only one commander set, an additional **+ Partner** button opens the
  modal in Partner-add mode — Scryfall search restricts to
  `kw:partner`, identity filtering is bypassed (Partners union, not
  intersect), and the selected card is appended via the domain's
  `addCommander` (which recomputes the deck's color identity as the
  union of both commanders).

Locked partnerships ("Partner with X"), Backgrounds, Doctor's
Companion, and Friends Forever are not yet handled — those will land
as follow-ups. The Scryfall card type now declares an optional
`keywords?: string[]` field used for the Partner detection.

Setting or swapping a commander now also resets the deck's color
identity to match. The renderer's inline `CardIdentifier` construction
in the commander wire-up was previously dropping the
`colorIdentity` (and `flavorName`) fields, so even when `addCommander`
ran on the domain side it computed an empty union. The fix carries
both fields through; the slice's `setCommanders` was also tightened
to recompute `deck.colorIdentity` via `deriveColorIdentity`, mirroring
what `addCommander` and `removeCommander` already do.
