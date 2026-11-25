---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Clicking a card in a deck or hovering a printing in the pull list shows it immediately: the preview uses card data the view already holds instead of fetching it again behind a spinner, and the image swaps in place without a blank frame or a layout jump.
