---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Populate the Electron app's native menu bar with File / Edit / View / Help
menus and standard keyboard shortcuts.

- **File**: New Deck (Cmd+N), Import Deck… (Cmd+I), Export Deck… (Cmd+E,
  enabled only while a deck is open), Quit.
- **Edit**: standard system roles (Cut/Copy/Paste/Undo/Redo/Select All) plus
  Find (Cmd+F) which focuses the deck-list search.
- **View**: a Theme submenu (one entry per shipped theme), zoom in/out/reset,
  full-screen, toggle DevTools.
- **Help**: About dialog, GitHub link, Documentation link.

Menu items send an IPC `menu:action` message which a top-level App listener
routes through the store. Each action increments a dedicated token counter
that the owning component (DeckList for new/import/find, DeckDetail for
export) watches via `useEffect`.
