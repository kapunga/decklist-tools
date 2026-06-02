---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix infinite render loop (React #185) when viewing a deck. `useScryfallCache` now keys its fetch effect on a stable id signature instead of an array reference, so it no longer re-runs every render and loops via `setCache`.
