---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Drop the `arena` and `mtgo` export formats from the MCP `deck_export` tool, matching the desktop app's export menu — Arena has no usable import flow to paste into, and MTGO's import is offline-client-only. `deck_export` now accepts only `moxfield`, `archidekt`, and `simple` (enforced by the existing format validator). The `mtg-deckbuilder-decks` skill and the docs are updated to match.
