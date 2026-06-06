---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix `ConcurrentModificationError` when importing decks. `Storage.saveDeck` now returns the persisted deck (with the incremented version) instead of mutating its argument and returning `void`, so the Electron renderer no longer holds a stale version across the IPC boundary. Both import flows now save the deck a single time — importing into an existing deck folds every card into one save (previously a per-card loop that silently failed after the first card while still reporting success), and creating a deck from an import builds it fully in memory before one save (previously a create-then-update sequence that conflicted on the second save). Pull-list mutations route through the same single-save path.

Also fix a "Maximum update depth exceeded" error that could surface during an import: the storage file watcher no longer broadcasts writes to the derived Scryfall cache (`cache/`), which `loadData` never reads — importing caches many cards at once, and reloading per cache file triggered a render storm. Storage-change reloads are now debounced, and a successful load clears any prior error so the app recovers cleanly.
