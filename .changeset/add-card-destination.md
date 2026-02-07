---
"@mtg-deckbuilder/electron-app": minor
---

Add destination selection when adding cards

- CardAddModal now shows radio buttons to choose where to add a card: Mainboard, Sideboard, or Maybeboard
- Default destination is based on the currently active tab (e.g., viewing Alternates tab defaults to Maybeboard)
- Sideboard option only appears for formats with sideboard support (not Commander)
- Added RadioGroup UI component based on Radix UI
