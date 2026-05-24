---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix reversible-layout cards (e.g. Secret Lair "Mountain // Mountain") being categorized as "Other" instead of their actual type. Scryfall returns `type_line: null` at the top level for these cards and puts each face's type on `card_faces[]`; `getTypeLine` and migration 006 now fall back to the first face's type line.
