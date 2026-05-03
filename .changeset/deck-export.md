---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add deck export — copy to clipboard or save to file in any of the five
supported formats (Arena / Mythic Tools, Moxfield CSV, Archidekt, MTGO,
simple text).

In the desktop app, deck detail gains an **Export** dropdown alongside Cache
and Roles. Copy-to-clipboard is the primary path (designed for paste into
Moxfield/Archidekt/Arena import boxes); Save-to-file writes a `.txt` via the
native save dialog.

The MCP server gains a `deck_export` tool returning `{ format, content,
lineCount, … }` so Claude-driven workflows can render decks in any of the
five formats. Format renderers themselves were already implemented in
`@mtg-deckbuilder/shared` — this change adds the trigger surfaces and
output-coverage tests.
