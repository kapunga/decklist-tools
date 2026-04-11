---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Bump CI Node.js to 22 for pnpm 10.33 compatibility. The 0.9.1 release did not produce binaries because the build workflows were pinned to Node 20 while pnpm 10.33 requires Node 22.13+ (it imports `node:sqlite`, which was added in Node 22.5).
