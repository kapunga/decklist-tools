---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix Sideboard/Alternates/Cut tab counts to sum card quantities instead of row count. Previously a sideboard of 5 rows × 3 copies showed "(5)" instead of the correct "(15)". Introduces a new shared helper `getEntriesTotalQuantity` for summing `quantity` across a `CardEntry[]`.
