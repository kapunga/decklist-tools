---
"@mtg-deckbuilder/electron-app": minor
---

Add Pull List view for tracking cards to pull from collection

- New Pull List tab in deck detail view shows cards grouped by set
- Displays quantity needed, quantity pulled, and remaining for each card
- Filter by rarity (mythic, rare, uncommon, common) and hide fully pulled cards
- Click rows to preview card image with pulled/needed counts
- Mark individual prints as pulled with quantity tracking modal
- "Mark All Pulled" button to quickly complete entire sets
- MCP server includes new pull-list-view for Claude to render pull lists
- Shared package adds pull tracking types and storage functions
