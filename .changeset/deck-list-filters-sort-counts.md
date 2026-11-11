---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

deck_list: filters now apply to Alternates and Sideboard (empty sections omitted, with a note); `sort_by` is applied to every section and group, defaulting to name; section headings show card counts (`N of M` when filtered). A card with unknown mana value no longer matches a `cmc` filter as if it were 0.
