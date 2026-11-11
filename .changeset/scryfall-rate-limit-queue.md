---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Scryfall requests now go through a real serialising rate-limit queue, retry 429/transient 5xx with backoff honouring `Retry-After`, and report an exhausted rate limit as "Rate limited by Scryfall; retry in Ns" instead of "Card not found". `search_cards` name/id/set lookups are served from the local card cache.
