---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix packaged app crashing on launch with "Cannot find module 'archiver'". electron-builder's dependency collector can't resolve the pnpm workspace, so externalised main-process modules were missing from the packaged build. `archiver` is now bundled into the Electron main process instead of left external.
