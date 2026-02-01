---
name: Release Checklist
about: Manual testing checklist for a new release
title: "Release Checklist: vX.Y.Z"
labels: release
assignees: ""
---

## DMG Installation

- [ ] Download DMG from GitHub Release
- [ ] Open DMG, drag app to Applications
- [ ] Launch app (use "Open Anyway" if blocked by Gatekeeper)
- [ ] App opens without errors

## Desktop App

- [ ] Deck list loads (or shows empty state)
- [ ] Create a new deck
- [ ] Add cards via quick-add with Scryfall autocomplete
- [ ] Change card roles, ownership, and status
- [ ] Move cards between mainboard, sideboard, and alternates
- [ ] View mana curve
- [ ] Delete a deck
- [ ] Keyboard shortcuts work (Cmd+N, Esc)

## MCP Server

- [ ] Connect to Claude Desktop from Settings page
- [ ] Claude Desktop shows `mtg-deckbuilder` as connected MCP server
- [ ] `list_decks` returns decks created in the desktop app
- [ ] `create_deck` creates a deck visible in the desktop app
- [ ] `add_card` resolves cards via Scryfall
- [ ] `view_deck` renders correctly
- [ ] `import_deck` imports a decklist

## Cross-App Sync

- [ ] Create a deck in Claude Desktop, confirm it appears in the desktop app
- [ ] Edit a deck in the desktop app, confirm changes visible via `get_deck` in Claude
