# Desktop App

The Electron app provides visual deck management with real-time sync to the MCP server.

## Deck List

The main screen shows all your decks with format badges, card counts, and progress bars. Use **Cmd+N** to create a new deck.

## Deck Detail

Click a deck to open the detail view. From here you can:

- **Add cards** using the quick-add bar with Scryfall autocomplete
- **Group cards** by role, type, or custom categories
- **Edit cards** — change roles, ownership status, or move between mainboard, sideboard, and alternates
- **View the mana curve** with filtering by card type

Press **Esc** to return to the deck list.

## Card Management

Each card tracks:

- **Status**: confirmed or considering
- **Ownership**: unknown (default), owned, pulled, or need to buy
- **Roles**: functional tags like "Ramp", "Removal", "Draw", etc.
- **List**: mainboard, sideboard, or alternates

## Settings

The Settings page lets you:

- Configure global roles
- Connect/disconnect Claude Desktop integration
- View storage location

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+N | Create new deck |
| Esc | Go back to deck list |
