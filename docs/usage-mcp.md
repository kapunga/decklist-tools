# MCP Server

The MCP server provides tools that let Claude Desktop help you build and manage decks through natural conversation.

## Getting Started

After [setting up the MCP server](/installation#mcp-server-setup), open Claude Desktop and try:

> "Create a new Commander deck called Isshin Attacks"

Claude will use the `manage_deck` tool and confirm the deck was created. Changes appear immediately in the desktop app.

## Available Tools

### Deck Management

| Tool | Description |
|------|-------------|
| [`list_decks`](/mcp/deck-management#list_decks) | List all saved decks |
| [`get_deck`](/mcp/deck-management#get_deck) | Get a deck by ID or name (includes validation) |
| [`manage_deck`](/mcp/deck-management#manage_deck) | Create, update, or delete a deck |

### Card Management

| Tool | Description |
|------|-------------|
| [`manage_card`](/mcp/card-management#manage_card) | Add, remove, update, or move cards in a deck |
| [`search_cards`](/mcp/card-management#search_cards) | Search for cards on Scryfall (name, UUID, or query) |

### Commander

| Tool | Description |
|------|-------------|
| [`manage_commander`](/mcp/commanders#manage_commander) | Add, remove, or swap commanders |

### Views

| Tool | Description |
|------|-------------|
| [`deck_list`](/mcp/views#deck_list) | Full card list with Oracle text, grouping, sorting, and filtering |
| [`deck_curve`](/mcp/views#deck_curve) | Mana curve analysis with CMC distribution and color pips |
| [`deck_notes`](/mcp/views#deck_notes) | Strategy notes: combos, synergies, themes |
| [`deck_pull_list`](/mcp/views#deck_pull_list) | Cards grouped by set for collection pulling |

### Roles

| Tool | Description |
|------|-------------|
| [`list_roles`](/mcp/roles#list_roles) | List all available roles |
| [`manage_role`](/mcp/roles#manage_role) | Add, update, or delete custom/global roles |

### Notes

| Tool | Description |
|------|-------------|
| [`list_deck_notes`](/mcp/notes#list_deck_notes) | List all notes for a deck |
| [`manage_deck_note`](/mcp/notes#manage_deck_note) | Add, update, or delete a deck note |

### Interest List

| Tool | Description |
|------|-------------|
| [`get_interest_list`](/mcp/interest-list#get_interest_list) | Get the full interest list |
| [`manage_interest_list`](/mcp/interest-list#manage_interest_list) | Add or remove cards from the interest list |

### Search & Collection

| Tool | Description |
|------|-------------|
| [`search_decks_for_card`](/mcp/search-reports#search_decks_for_card) | Find which decks contain a card |
| [`get_collection_filter`](/mcp/search-reports#get_collection_filter) | Generate a Scryfall filter from your set collection |

## Example Conversation

```
User: Create a Commander deck called Isshin Attacks

Claude: [Uses manage_deck with action=create]
Created deck "Isshin Attacks" in Commander format.

User: Show me the mana curve

Claude: [Uses deck_curve]
...

User: Which of my decks have Sol Ring?

Claude: [Uses search_decks_for_card]
...
```
