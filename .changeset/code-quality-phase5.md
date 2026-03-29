---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Code quality: Scryfall fetch dedup, parser framework, performance improvements, typed discriminator constants

- Extract generic `fetchFromScryfall<T>()` helper, reducing 7 duplicate try/catch/404 patterns to one-liners
- Add `parseLinesWithSections()` framework for line-based format parsers (Arena, MTGO, Simple)
- Remove legacy `findCardInList`/`findCardIndexInList` re-export aliases
- Add `buildRoleLookup()` for O(1) role lookups in view rendering loops
- Derive `getCacheStats()` from CacheIndex instead of per-file statSync calls
- Replace ~200 bare discriminator strings with typed `as const` objects across all packages
- Add `DeckListName`, `INCLUSION_STATUS`, `OWNERSHIP_STATUS`, `FORMAT_TYPE`, `NOTE_TYPE`, `ADDED_BY`, `DECK_LIST`, `PARSER_SECTION` constants
