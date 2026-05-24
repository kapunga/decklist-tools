---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Extend Broadsheet design language into the deck-detail body (#162). The card list inside the Cards / Alternates / Sideboard / Cut tabs now matches the masthead's editorial register: newspaper-section group headers replace Badge pills (closes #176), Buy/Pulled badges use theme tokens (closes #177), role chips become sharp-cornered with color-mixed tints, the focused-card panel gains editorial framing with name / type-line / cost / printing / roles meta rows, the filter bar adopts caption-label + italic value cells, and the batch operations toolbar is restyled as a sharp-cornered bubble with caption-tag verbs separated by hairline dividers. Adds `captionLabelStyle` and `editorialTextStyle` to the shared style module.
