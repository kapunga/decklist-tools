---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix pull list section headings: cards outside the collection are now grouped under their real set name with a "not in collection" label instead of several identical "Not in collection" headings, and set names for sets outside the collection resolve from cached card data instead of showing raw set codes.
