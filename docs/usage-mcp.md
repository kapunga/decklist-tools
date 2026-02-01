# MCP Server

The MCP server provides 30+ tools that let Claude Desktop help you build and manage decks through natural conversation.

## Getting Started

After [setting up the MCP server](/installation#mcp-server-setup), open Claude Desktop and try:

> "Create a new Commander deck called Isshin Attacks"

Claude will use the `create_deck` tool and confirm the deck was created. Changes appear immediately in the desktop app.

## Available Tools

### Deck Management

| Tool | Description |
|------|-------------|
| `list_decks` | List all saved decks |
| `get_deck` | Get a deck by ID or name |
| `create_deck` | Create a new empty deck |
| `update_deck_metadata` | Update name, description, archetype, or strategy |
| `delete_deck` | Delete a deck permanently |

### Card Management

| Tool | Description |
|------|-------------|
| `add_card` | Add a card (resolves via Scryfall) |
| `remove_card` | Remove a card from a deck |
| `update_card` | Update roles, status, ownership |
| `move_card` | Move between mainboard, alternates, sideboard |
| `lookup_card` | Look up a card without adding to a deck |

### Commander

| Tool | Description |
|------|-------------|
| `set_commanders` | Set commander(s) and color identity |

### Views

| Tool | Description |
|------|-------------|
| `view_deck` | Render a deck in a specific view format |
| `list_views` | List available views |

Available views: `full`, `skeleton`, `checklist`, `curve`, `buy-list`, `by-role`, `by-type`, `notes`

### Roles

| Tool | Description |
|------|-------------|
| `list_roles` | List all available roles |
| `add_custom_role` | Add a custom role to a deck |
| `add_global_role` | Add a new global role |

### Notes

| Tool | Description |
|------|-------------|
| `add_deck_note` | Add a note to a deck |
| `update_deck_note` | Update an existing note |
| `delete_deck_note` | Delete a note |
| `list_deck_notes` | List all notes for a deck |

### Interest List

| Tool | Description |
|------|-------------|
| `get_interest_list` | Get the full interest list |
| `add_to_interest_list` | Add a card to the interest list |
| `remove_from_interest_list` | Remove a card |

### Import/Export

| Tool | Description |
|------|-------------|
| `import_deck` | Import from Arena, Moxfield, Archidekt, MTGO, or simple text |
| `export_deck` | Export to a specific format |
| `list_export_formats` | List available formats |

### Validation & Search

| Tool | Description |
|------|-------------|
| `validate_deck` | Check against format rules |
| `search_decks_for_card` | Find which decks contain a card |
| `get_buy_list` | Get all "need to buy" cards across decks |

## Example Conversation

```
User: Import this deck:
1 Isshin, Two Heavens as One (NEO) 226
1 Aurelia, the Warleader (GTC) 143
1 Combat Celebrant (AKH) 125

Claude: Created deck with 3 cards. All cards resolved successfully.

User: Show me the mana curve

Claude: [Uses view_deck with view=curve]
...

User: What cards do I still need to buy across all my decks?

Claude: [Uses get_buy_list]
...
```
