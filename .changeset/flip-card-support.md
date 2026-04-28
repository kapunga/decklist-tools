---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add support for flip-layout cards (Champions of Kamigawa style — Akki
Lavarunner / Tok-Tok, Volcano Born; Bushi Tenderfoot / Kenzo the
Hardhearted; etc).

Unlike DFCs, flip cards have a single Scryfall image with the alternate
face drawn upside-down on the bottom half. "Flipping" them is a 180°
rotation of the same image, not a fetch of a different URL.

### Deck art (`DeckCardPreview`)

The hover flip button now appears on flip-layout deck art (it previously
only handled `transform` / `modal_dfc` / `reversible_card`). Toggling it
on a flip card stores `artCardFace: 'flipped'`, which renders the front
URL with `transform: rotate(180deg)`.

### Card preview modal (`CardImage`)

The flip button now appears on flip-layout cards in the preview modal,
rotating the image in place rather than seeking a non-existent back URL.

### Type changes (`@mtg-deckbuilder/shared`)

- `Deck.artCardFace` widens from `'front' | 'back'` to a new
  `ArtCardFace = 'front' | 'back' | 'flipped'` union. Existing values
  remain valid; no migration needed.
- New `TWO_FACED_LAYOUTS` and `ROTATED_LAYOUTS` constants codify which
  layouts use which strategy.
- New `isArtCardFaceValid(face, layout)` validator. The deck-tile
  toggle is correct by construction, but the validator gates the
  render-side fallback: if a stored face is incoherent with the
  resolved card's layout (e.g. art card was swapped to a card with a
  different layout), the renderer falls back to `'front'` instead of
  mis-rendering. Storage is not rewritten on the fly — the next
  explicit toggle overwrites cleanly.
