---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add a Cut tab to the deck detail UI so cut cards are visible and movable

The card list refactor introduced a `cut` card set as a soft-delete area for cards the user removed from a deck but wanted to keep for recall, but no UI was added to view or populate it. Cards in the cut set were invisible to the Electron app — only the MCP `manage_card` tool could put cards there, and once placed they were unreachable from the UI. This fixes that.

**New "Cut" tab in `DeckDetail.tsx`.** Slots between Sideboard (or Alternates, for decks with no sideboard) and Notes. Always visible regardless of cut count, mirroring how Alternates is always visible. The tab label shows the current cut count, e.g. `Cut (3)`. The tab content reuses the existing `DeckListView` component without modification — `DeckListView` was already generic over `CardSetName`, so it renders cut cards correctly without any branching.

**"Move to Cut" in the per-card dropdown** (`CardItem.tsx`). Adds one more conditional `DropdownMenuItem` to the existing "Move to" submenu, gated by `listType !== CARD_SET.CUT`. From any non-cut tab, users can now cut individual cards; from inside the Cut tab, users can move cards back to Mainboard / Alternates / Sideboard via the existing menu items.

**"Move to Cut" in the batch toolbar** (`BatchOperationsToolbar.tsx`). Adds Cut to the multi-select `moveTargets` array under the same guard. No `hasSideboard`-style format gate — Cut is format-independent.

**No changes outside the three component files.** The store layer (`moveCard`, `batchMoveCards`), the domain layer (`getCutList`, `getNonCutEntries`), and the shared `CARD_SET` constant were already cut-aware from the prior refactor. `getCardCount` already excluded cut entries (it counts mainboard + commanders only), so cutting a card visibly drops the mainboard count and restores format validation headroom — matching the mental model that a cut card is no longer in the deck.
