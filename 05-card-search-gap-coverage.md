# mtg-deckbuilder Search Capabilities Gap Fix

## Context

The mtg-deckbuilder MCP server is meant to supersede deckbuilder-mcp, but it's missing several important search capabilities. Currently mtg-deckbuilder only has a `lookup_card` tool that searches by name with optional set_code and collector_number.

## Missing Capabilities

The old deckbuilder-mcp server had these search tools that need to be replicated:

1. **Scryfall syntax search** (`scryfall_card_search`)
   - Accepts complex Scryfall queries like `"t:creature c:black cmc<=3"`, `"o:draw"`, `"f:standard"`
   - Takes `searchTerm` (string) and `limit` (integer) parameters
   - Returns list of matching cards

2. **Find by Scryfall ID** (`find_card_by_scryfall_id`)
   - Looks up a card directly by its Scryfall UUID
   - Takes `scryfallId` (string) parameter
   - Returns single card

3. **Exact match flag** (part of `find_card_by_name`)
   - The old server's `find_card_by_name` had an `exact` boolean parameter
   - When true, only exact name matches were returned
   - When false, fuzzy matching was used
   - Current `lookup_card` doesn't have this distinction

## Task

Add these missing search capabilities to mtg-deckbuilder:

1. Add a tool for Scryfall syntax searching (similar to `scryfall_card_search`)
2. Add a tool for looking up cards by Scryfall ID
3. Add an `exact` boolean parameter to the existing `lookup_card` tool (or create a separate exact-match tool)

## Implementation Notes

- Use the existing Scryfall API integration patterns already in the codebase
- Return cards in the same format as other mtg-deckbuilder tools for consistency
- Ensure proper error handling for invalid Scryfall queries or non-existent IDs
- Consider naming conventions that match the existing mtg-deckbuilder style

## Testing

After implementation, verify that:
- Complex Scryfall queries work (test with queries like `"c:blue t:instant cmc<=2"`)
- Scryfall ID lookups return the correct card
- Exact vs fuzzy name matching behaves as expected

## Goal

Make mtg-deckbuilder a complete replacement for deckbuilder-mcp with no functionality regression.
