---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix pull list and card merge bugs

- Fix commander pull not reflecting in UI by removing over-restrictive printing filter
- Fix pull list hiding "considering" cards by aligning filter with main deck list (exclude only "cut")
- Remove collection level rarity filtering from pull list (collection level is advisory, not a hard gate)
- Fix card merge not upgrading inclusion status when re-adding an existing card
