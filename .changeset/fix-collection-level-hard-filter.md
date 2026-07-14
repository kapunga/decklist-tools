---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix collection levels (1-4) being used as a hard rarity filter instead of a likelihood hint. `get_collection_filter` baked `r:common OR r:uncommon...` into the generated Scryfall query per set, and the pull list view (`deck_pull_list`) silently dropped any owned-set printing whose rarity exceeded the tracked level — both presented an educated guess about how deeply a user has engaged with a set as certainty about which specific cards they own. `get_collection_filter` now scopes queries by set only (also keeping generated queries well under Scryfall's 500-character limit), while still returning each set's level/rarities as metadata; the pull list now includes higher-rarity printings from owned sets, flagged as lower-confidence rather than excluded.
