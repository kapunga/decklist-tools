# MCP Server

The MCP server provides 15 tools that let Claude Desktop help you build and manage decks through natural conversation.

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
| [`manage_card`](/mcp/card-management#manage_card) | Add, remove, update, or move a card in a deck |
| [`search_cards`](/mcp/card-management#search_cards) | Search for cards on Scryfall (name, UUID, or query) |

### Commander

| Tool | Description |
|------|-------------|
| [`set_commanders`](/mcp/commanders#set_commanders) | Set commander(s) and color identity |

### Views

| Tool | Description |
|------|-------------|
| [`view_deck`](/mcp/views#view_deck) | Render a deck in a specific view format |

Available views: `full` (supports `group_by` and `sort_by` params), `curve`, `notes`

### Roles

| Tool | Description |
|------|-------------|
| [`list_roles`](/mcp/roles#list_roles) | List all available roles |
| [`manage_role`](/mcp/roles#manage_role) | Add custom/global roles, update or delete global roles |

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

### Search & Reports

| Tool | Description |
|------|-------------|
| [`search_decks_for_card`](/mcp/search-reports#search_decks_for_card) | Find which decks contain a card |
| [`get_buy_list`](/mcp/search-reports#get_buy_list) | Get all "need to buy" cards across decks |

## Example Conversation

```
User: Create a Commander deck called Isshin Attacks

Claude: [Uses manage_deck with action=create]
Created deck "Isshin Attacks" in Commander format.

User: Show me the mana curve

Claude: [Uses view_deck with view=curve]
...

User: What cards do I still need to buy across all my decks?

Claude: [Uses get_buy_list]
...
```
