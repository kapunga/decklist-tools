---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix bimodal card type categorization

- Cards with dual type lines (Adventures, Omens, MDFCs) now prioritize permanent types over spell types
- For example, "Land // Instant" cards like Lindblum now categorize under Land instead of Instant
- Updated `getPrimaryType` in both shared package and electron-app
