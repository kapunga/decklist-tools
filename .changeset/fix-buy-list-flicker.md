---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix flickering price column and loading spinner on the Buy List view.

`useBuyList` rebuilt its return array on every render, so its consumers
saw a fresh reference each time. `BuyListView` had `useEffect(..., [buyList])`
fetching prices, which formed a self-sustaining loop: render → new array
reference → effect → fetch → `setPrices` → render → new array reference →
fetch again. The flicker was the loading spinner toggling on and off as
the loop ran.

Memoized `useBuyList` on `decks` so the returned array is referentially
stable when the underlying decks haven't changed.
