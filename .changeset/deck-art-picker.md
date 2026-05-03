---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add a card-art picker dialog accessible from each deck tile's `⋮` menu (the **Set deck art...** item that was deferred when the menu shipped). The picker lets you pick any card from the deck and then any printing of that card — including printings that aren't in the deck — so the tile's hero art is fully decoupled from your playing copy.

### Highlights

- **Inline-accordion card list, dropdown of distinct illustrations.** Printings are deduplicated by `illustration_id` so a card with 50+ reprints collapses to its handful of unique artworks. Non-promo printings are preferred as the canonical representative for an illustration; canonicals are sorted newest-first in the dropdown.
- **DFC handling.** For double-faced cards (`transform` / `modal_dfc` / `reversible_card`), the dropdown emits one option per front-face illustration, and the preview shows both faces side-by-side. Clicking either face selects which one gets persisted.
- **Flip-card handling.** Champions-of-Kamigawa-style flip layouts emit upright + flipped options per illustration; the saved face value renders the tile rotated 180°.
- **Smart bootstrap.** Modal opens with whatever art is currently displayed: the saved override if one exists (with the matching deck row auto-expanded), otherwise the commander-resolved default.
- **Visual selection indicator.** The pending face is marked with a focus ring; for DFCs both faces remain visible while only one carries the ring.

### Schema

`ScryfallCard` extended with optional `illustration_id`, `artist`, `released_at`, and `promo` fields populated directly from Scryfall API responses. Additive only; no migration needed.
