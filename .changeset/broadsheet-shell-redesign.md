---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Broadsheet shell redesign for the deck-list page (#146).

The top horizontal tab nav has been replaced with a collapsible left sidebar.
The deck-list page header has been reworked in an editorial broadsheet
typographic register: italic display title sized to the page, italic
theme-keyed tagline ("twelve in the library", "twelve in the crypt", etc.),
a 2px masthead rule below the title, and caption-uppercase labels on filter
controls. The shell consumes new per-theme tokens (`--action-bg`,
`--action-fg`, `--masthead-rule-color`), with cyberpunk-specific overrides
that switch nav labels to JetBrains Mono caps and rules to neon cyan.

### Behavior changes

- New left sidebar with brand wordmark, primary nav (Decks, Interest List,
  Buy List), and a bottom dock containing Settings + a theme indicator.
- Sidebar collapses to a 64px icon rail via the chevron at top-right of the
  brand row.
- Filter row in the deck list adopts borderless inputs: search is now a
  hairline-bottom field with an italic placeholder; format dropdown and
  status toggle render as inline text-with-chevron rather than boxed
  controls. Color identity pip circles preserved.

### Notes

- Settings remains a sidebar destination for now; it will move to its own
  native window once #160 lands.
- Interest List will rename to Lists when #139 lands; only the sidebar label
  changes at that point.
- Tile-level deck cards untouched in this pass — the chrome around them is
  the focus of #146.
