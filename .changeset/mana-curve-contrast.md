---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix the mana curve being nearly invisible (dark themes especially), and clean up the same anti-pattern in the consistency heatmap. Both components were wrapping our hex CSS variables in `hsl(...)` (legacy shadcn convention not used in this project per `feedback_css_color_tokens.md`), producing invalid CSS that effectively made bar fills, tooltip backgrounds, and heatmap-cell text transparent. The pie chart's hardcoded Tailwind palette also fell off-theme on Cyberpunk / Gothic. Now uses theme tokens directly throughout: bar fill in `var(--foreground)`, axis ticks in `var(--muted-foreground)`, pie fills in `var(--color-w/u/b/r/g/c)` with `var(--foreground)` strokes so slices remain separable on any background, and heatmap cell text in `var(--foreground)` where the data-driven background contrast allows.
