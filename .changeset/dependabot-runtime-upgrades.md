---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Upgrade runtime dependencies pulled in by Dependabot since the last release:

- `react` 18.2 → 19.2.5 (electron-app)
- `react-router-dom` 6.30 → 7.14 (electron-app)
- `recharts` 2.15 → 3.8 (electron-app); fixes ManaCurve pie label to handle the new `percent: number | undefined` type
- `tailwind-merge` 2.6 → 3.5 (electron-app)
- `@tanstack/react-query` → 5.97 (electron-app)
- `@modelcontextprotocol/sdk` → 1.29 (mcp-server)
