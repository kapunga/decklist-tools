---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

CI now runs the full workspace test suite on every pull request (`pnpm -r test`) instead of only the MCP server's tests. This brings shared (290 tests) and electron-app (25 tests) under CI coverage alongside mcp-server (146 tests) — 461 tests total per PR.
