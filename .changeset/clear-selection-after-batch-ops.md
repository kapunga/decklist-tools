---
"@mtg-deckbuilder/electron-app": patch
---

Clear selection after batch operations in multi-select toolbar

- Added selection clearing to batchUpdateOwnership and batchAddRoleToCards
- Now all batch operations (ownership, delete, move, add role) dismiss the toolbar after completing
