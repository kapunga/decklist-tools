---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix `search_cards` failing on ambiguous card names. Scryfall's fuzzy
`/cards/named` endpoint returns 404 for both "no match" and "ambiguous
match" (e.g. "Sephiroth" matches multiple Final Fantasy printings), so
the tool was reporting these as `Card not found`. When fuzzy lookup
returns nothing, the handler now falls back to a `name:"<query>"`
substring search and returns the candidates with a "Multiple cards
match…" header so Claude can disambiguate. Genuine misses still surface
as `Card not found`. Exact (`exact: true`) lookups are unchanged.
