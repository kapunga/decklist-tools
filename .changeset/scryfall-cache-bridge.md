---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Bridge the on-disk Scryfall cache to the Electron renderer so card type lines resolve instantly without network fetches

**The bug.** The Electron renderer's `useScryfallCache` hook used React Query's `useQueries` with `queryFn: () => getCardById(id)`, which is a straight `fetch()` against `https://api.scryfall.com/cards/{id}`. It never read from the local on-disk Scryfall cache that `Storage.getCachedCard()` maintains. Every deck open kicked off ~100 parallel network fetches, and while in flight (or after silent failures), cards had no resolved type line and fell into the `Other` group in `DeckListView`. The "System → Scryfall Cache → Load All Cards" command populated the on-disk cache (good for the MCP server) but did nothing for the Electron UI because the UI ignored that directory entirely. Most visible on decks with many recent printings — the Final Fantasy commander deck made it impossible to miss.

**The fix.** Added a new `cache:get-cards` IPC handler in the Electron main process that takes a batch of `scryfallId`s and returns the cached subset as a plain record (misses are silently dropped). Wired it through `preload.ts` and the renderer-side ambient type in `vite-env.d.ts`. Rewrote `useScryfallCache` to call the IPC bridge via plain `useState` + `useEffect` (with a cancellation flag for deck switches) instead of React Query. The hook's return shape (`{ cache, isLoading }`) is unchanged, so neither `DeckListView` nor `DeckStats` (the two consumers) needed any modifications.

**Net result.** Cached cards now resolve instantly with one batched IPC round-trip per deck render and zero network calls. `Load All Cards` actually benefits the UI now. Two consumers, one new file path, zero behavior change for cache hits.

**Out of scope (deferred to follow-ups).**
- No network fallback on cache miss yet — missing cards still fall into the `Other` group, same as the existing transient state, just permanent until the user re-runs `Load All Cards`. A proper fallback would need a write-back IPC and race-condition handling.
- `usePullList.ts` still uses React Query to fetch printings by name via `getCardPrintings(name)` — same architectural smell, different IPC shape needed, separate branch.
- The renderer doesn't yet subscribe to file-watcher events for cache writes, so cards cached by the MCP server while the Electron app is open won't appear until the user re-opens the deck.
