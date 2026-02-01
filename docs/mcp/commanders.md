# Commanders

Tools for setting deck commanders and color identity.

## `set_commanders`

Set the commanders for a Commander format deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |
| `commander_name` | string | yes | Commander card name |
| `set_code` | string | no | Set code |
| `collector_number` | string | no | Collector number |

**Response:**
```json
{
  "success": true,
  "commanders": ["Atraxa, Praetors' Voice"],
  "colorIdentity": ["W", "U", "B", "G"]
}
```
