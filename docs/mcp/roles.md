# Roles

Tools for managing global and deck-specific roles.

## `list_roles`

List all available roles (global + deck-specific if deck_id provided).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | no | Include deck-specific custom roles |

**Response:**
```json
{
  "global": [
    { "id": "ramp", "name": "Ramp", "description": "Mana acceleration", "color": "#22c55e" }
  ],
  "custom": [
    { "id": "blink-target", "name": "Blink Target", "description": "ETB value creatures" }
  ]
}
```

## `manage_role`

Add or manage roles.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add_custom`, `add_global`, `update_global`, or `delete_global` |
| `deck_id` | string | add_custom | Deck UUID |
| `id` | string | yes | Role ID (lowercase with hyphens) |
| `name` | string | add_custom/add_global | Display name |
| `description` | string | no | Role description |
| `color` | string | no | Hex color code (e.g. `#ef4444`) |

**Response:**
```json
{ "success": true, "role": { "id": "fast-mana", "name": "Fast Mana" } }
```
