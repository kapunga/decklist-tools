# Docsite screenshots — capture & insertion plan

The documentation overhaul (June 2026) added a guided tour, a full Settings page, a
"Building with Claude" overview, and a Skills page. All of them are prose right now, and prose
only gets you so far when the thing you're describing is a visual app. This doc is the punch list
of screen captures that would make those pages click, and exactly where each one goes.

Every insertion point already exists in the Markdown as an HTML comment of the form:

```
<!-- SCREENSHOT: <id> | <what it should show> -->
```

So the workflow is: capture the image, drop it in `docs/public/screenshots/<id>.png`, and replace
the matching comment with an image tag. VitePress rewrites root-absolute asset paths with the
site base automatically, so the tag is:

```markdown
![Descriptive alt text](/screenshots/<id>.png)
```

A note on the captures themselves: shoot them in a **light theme** (Strixhaven is the default and
reads cleanly) for consistency, at a normal window size — not maximized on a 4K display, or the UI
elements come out tiny in the page. A couple of close-up crops are called for below; those are
noted. Use a deck with real, recognizable cards in it rather than an empty or toy deck — the
screenshots are doing double duty as a demo of what a filled-in app looks like.

This is a one-time procedure doc. Delete it once the screenshots are captured and inserted.

## Captures grouped by app screen

Capturing is fastest if you move through the app screen by screen rather than page by page, since
several docs pages reuse the same screen. The right-hand column is every place that image gets
inserted.

### Deck library (the home screen)

| id | What to show | Inserted in |
|----|--------------|-------------|
| `deck-library` | The "Decks" masthead, New Deck + Import Deck buttons, the search box and filter bar, and a grid of several deck tiles with color pips and card counts. | `docs/usage-electron.md` → "The deck library" |
| `sidebar` | The expanded left sidebar: Decks / Lists / Buy List nav, the gear/Settings icon, and the current theme name at the bottom. | `docs/usage-electron.md` → "The left sidebar" |
| `buy-list` | The Buy List view aggregating "Need to Buy" cards across decks — quantities, live Scryfall prices, sortable columns. | `docs/usage-electron.md` → "The buy list" |
| `card-lists-grid` | The Lists section: the built-in interest list alongside a couple of custom lists (Wishlist, Collection), ideally one opened to show its cards. | `docs/usage-electron.md` → "Card lists and the interest list" |

### Deck detail (open a real, filled-in deck)

| id | What to show | Inserted in |
|----|--------------|-------------|
| `deck-detail-mainboard` | The deck detail view: editable name, the status line (format, color identity), the Export button, the tab row, Mainboard active with a commander pinned at the top. | `docs/usage-electron.md` → "Opening a deck" |
| `quick-add-modal` | The Quick Add search with an autocomplete dropdown, plus the add-card modal (quantity, section selector, role checkboxes, printing picker). May need two shots composited, or pick the modal. | `docs/usage-electron.md` → "Adding cards" |
| `role-badges` | A card list grouped by role, with group headers (Ramp, Removal, Card Draw) and cards showing their colored role badges. | `docs/usage-electron.md` → "Roles: tagging cards by their job" |
| `stats-mana-curve` | The Stats tab: the stacked-by-color mana curve chart, the role breakdown counts, the needs-purchase count, and the consistency-matrix heatmap. | `docs/usage-electron.md` → "Stats and the mana curve" |
| `pull-list` | The Pull List tab: cards grouped by Magic set, checkboxes and remaining counts, and identify mode showing a card image. | `docs/usage-electron.md` → "Ownership and the pull list" |
| `import-dialog` | The import dialog with a pasted decklist, the auto-detected format indicated, and the preview showing section counts. | `docs/usage-electron.md` → "Importing and exporting" |

### Settings (one capture per pane)

| id | What to show | Inserted in |
|----|--------------|-------------|
| `settings-themes` | The General pane: the Light/Dark mode toggle and the grid of six theme cards, active theme highlighted. | `docs/settings.md` → "General" |
| `settings-set-collection` | The Set Collection pane: the search-to-add field and the grouped table (code, year, name, per-row Level dropdown). | `docs/settings.md` → "Set Collection" |
| `settings-roles` | The Roles pane: the Add Role button, a row of colored role pills, one pill's hover tooltip showing description + usage stats. | `docs/settings.md` → "Roles" |
| `settings-mcp-connect` | The MCP Server pane: the three integration cards (Claude Desktop, Claude Code, Gemini CLI) with connect buttons and status. | `docs/settings.md` → "MCP Server" **and** `docs/usage-mcp.md` → "Getting connected" |
| `settings-skills` | The Skills pane: the per-client install/update/uninstall table with the bulk "All" actions and the Save export button. | `docs/settings.md` → "Skills" **and** `docs/skills.md` → "Installing skills" (the `settings-skills-table` placeholder there can reuse this image) |
| `skill-install-action` | A close-up crop of a single skill row showing the Install / Update / Export controls, ideally with the "stale — Update available" state visible. | `docs/skills.md` → "Installing skills" |
| `settings-data` | The Data pane: the Export Collection button and the Import Collection button with its replace-all warning. | `docs/settings.md` → "Data" |
| `settings-cache` | The Cache pane: cache statistics, the Load All Cards control (data/images choice), the cache settings, and the maintenance buttons. | `docs/settings.md` → "Cache" |

### AI assistant integration (needs an assistant connected)

These two are the hardest to stage because they need a live assistant session, but they're the
ones that actually sell the "talk to your collection" idea, so they're worth the effort. Shoot
them with whichever assistant is easiest (Claude Desktop is the usual choice).

| id | What to show | Inserted in |
|----|--------------|-------------|
| `claude-conversation-example` | A real Claude Desktop thread building a deck — a couple of turns of back-and-forth, matching the Isshin example in the prose. | `docs/usage-mcp.md` → "An example conversation" |
| `claude-deck-result` | The desktop app open next to a Claude reply, showing a card the assistant just added appearing in the app (the "stays in sync" moment). Reused for the curve/type-breakdown result. | `docs/usage-mcp.md` → intro **and** "What you can ask → Understanding a deck" |

## Priority order

If these get captured in batches, this is the order that buys the most clarity per shot:

1. `deck-library`, `deck-detail-mainboard`, `stats-mana-curve` — the three that define what the app
   *is*. The library and a filled deck do the most work on the landing path.
2. The Settings panes (`settings-themes` through `settings-cache`) — the Settings page is wall-to-wall
   prose right now and benefits the most from a picture per section.
3. `claude-conversation-example` / `claude-deck-result` — highest payoff for the Claude story, but
   they need a staged session, so they're the most effort.
4. Everything else (`sidebar`, `quick-add-modal`, `role-badges`, `pull-list`, `card-lists-grid`,
   `buy-list`, `import-dialog`, `skill-install-action`) — nice supporting detail, capture as time allows.

## Open question: the home hero

The landing page (`docs/index.md`) currently leans on the Yakushima background art for its visual
punch and doesn't have a screenshot slot. If you'd rather lead with a real shot of the app, a clean
`deck-library` capture would slot in well there too — but that's a design call, not a gap.
