# Notes

Tools for managing deck notes (combos, synergies, strategy, etc.).

## `list_deck_notes`

List all notes for a deck.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `deck_id` | string | yes | Deck UUID |

**Response:**
```json
[
  {
    "id": "n1o2p3q4-...",
    "title": "Blink Combo",
    "noteType": "combo",
    "cardRefs": [{ "cardName": "Eternal Witness", "ordinal": 1 }],
    "content": "Flicker Eternal Witness to loop spells.",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

## `manage_deck_note`

Add, update, or delete a deck note.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | `add`, `update`, or `delete` |
| `deck_id` | string | yes | Deck UUID |
| `note_id` | string | update/delete | Note UUID |
| `title` | string | add | Note title |
| `content` | string | add | Markdown content |
| `note_type` | string | add | `combo`, `synergy`, `theme`, `strategy`, or `general` |
| `card_names` | string[] | no | Associated card names, ordered by relevance |
| `role_id` | string | no | Role to propagate to associated cards |
| `remove_role` | boolean | no | Remove role from associated cards (update/delete) |

**Response (add/update):**
```json
{ "success": true, "note": { "id": "n1o2p3q4-...", "title": "Blink Combo", "noteType": "combo", "..." } }
```

**Response (delete):**
```json
{ "success": true, "message": "Note \"Blink Combo\" deleted" }
```
