---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add deck export — copy to clipboard or save to file in the formats whose
import flows we can target.

In the desktop app, deck detail gains an **Export** dropdown alongside Cache
and Roles. Copy-to-clipboard is the primary path (designed for paste into
Moxfield/Archidekt import boxes); Save-to-file writes a `.txt` via the native
save dialog.

### Format-specific notes

- **Moxfield** — its import UI accepts each section into a separate paste box
  (mainboard, sideboard, maybeboard), so the dropdown surfaces one menu item
  per non-empty section. Output follows Moxfield's documented deck-import
  grammar (`AMOUNT CARDNAME (SETCODE) NUMBER *F*`); the prior CSV
  implementation was wrong (CSV is for collection import, not decks) and has
  been replaced.
- **Archidekt** — emits `Nx CARDNAME (SET) NUMBER`. Role tags are intentionally
  not emitted: Archidekt's parser greedy-matches between the first and last
  caret on a line, so any card with two-plus tags would fail to import. Tag
  alignment across deckbuilders is tracked in a separate ticket. Structural
  brackets (`[Commander]`, `[Sideboard]`, `[Maybeboard]`) are retained so
  Archidekt can bucket cards correctly.
- **Simple Text** — generic plain-text decklist, useful for any importer that
  accepts bare `N CardName` lines.
- **Arena and MTGO** — registered as formats so import auto-detect still
  works, but **not surfaced for export**. Mythic Tools (the historical pair
  for the Arena format) doesn't have an end-user import flow we can target,
  and MTGO's import is offline-client-only.

### Renderer API

`RenderOptions` gains an optional `section: 'mainboard' | 'sideboard' |
'maybeboard'` for tools whose import UI is section-scoped. When omitted, the
renderer emits the full deck (existing behaviour, used by the MCP tool and
non-Moxfield formats).

### MCP

A new `deck_export` tool returns `{ format, content, lineCount, … }` so
Claude-driven workflows can render decks programmatically. The tool accepts
the same `section` argument as the UI, so an LLM can request just the
sideboard if needed.
