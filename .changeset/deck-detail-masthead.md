---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Rework the deck-detail page masthead into Broadsheet's editorial grammar (#162). Italic display title with theme-keyed tagline and commander byline, 2px masthead rule, caption-uppercase action cluster with the per-theme action button on Import, italic status line replacing the round-pill progress bar, and newspaper-section-label tabs split into primary card-set and secondary tools clusters. Adds `--font-tagline` (so Cyberpunk's italic register can fall through to JetBrains Mono since Space Grotesk has no italic axis) and `--pip-backplate` (so color-identity pips read on dark themes). Sweeps up hardcoded Tailwind palette colors in the validation and cache-result notifications. Body-layer follow-ups tracked under #176-#179.
