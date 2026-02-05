---
"@mtg-deckbuilder/electron-app": minor
---

Add card edit modal with printing selection

- New CardEditModal component for editing card details (quantity, notes, roles, ownership)
- Added printing selector dropdown showing all available printings with set code, collector number, and set name
- Added `getCardPrintings` function to query Scryfall for all printings of a card
- Edit button added to both Grid view (CardItem menu) and List view (CardRow pencil icon)
- Fixed ownership badge layout shift in list view by using fixed-width container
