---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Renamed the six built-in themes to MTG-flavored display names:

| Old name   | New name       |
| ---------- | -------------- |
| Library    | Strixhaven     |
| Fantasy    | Dominaria      |
| Steampunk  | Kaladesh       |
| Ukiyo-e    | Kamigawa       |
| Cyberpunk  | Neo Kamigawa   |
| Gothic     | Innistrad      |

Display names only — internal theme IDs (`'library'`, `'fantasy'`, etc.),
CSS class names (`.theme-library`), and stored config values are unchanged,
so existing user configs continue to work without migration.
