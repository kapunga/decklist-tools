# Commanders

Tools for managing deck commanders and color identity.

## `manage_commander`

Add, remove, or swap commanders for a Commander format deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add`, `remove`, or `swap` |
| `deck_id` | string | yes | Deck UUID |
| `commander_name` | string | yes | Commander card name |
| `set_code` | string | no | Set code |
| `collector_number` | string | no | Collector number |
| `force` | boolean | no | Skip name/set mismatch check |
| `new_commander_name` | string | swap | New commander name (swap only) |
| `new_set_code` | string | no | Set code for new commander (swap only) |
| `new_collector_number` | string | no | Collector number for new commander (swap only) |

**Response:**
```json
{
  "success": true,
  "commanders": ["Atraxa, Praetors' Voice"],
  "colorIdentity": ["W", "U", "B", "G"]
}
```
