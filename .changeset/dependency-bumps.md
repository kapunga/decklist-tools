---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Dependency maintenance.

Production dependencies (electron-app):
- `lucide-react` 0.294.0 → 1.11.0
- `@tanstack/react-query` 5.99.0 → 5.100.1
- `react-router-dom` 7.14.1 → 7.14.2

Toolchain (TypeScript 6.0): bumped TypeScript 5.9.3 → 6.0.3 across all
packages and adjusted configs to match TS 6 stricter defaults — added
`"types": ["node"]` to the base tsconfig (TS 6 no longer auto-discovers
hoisted `@types/node` from a parent directory), removed the deprecated
`baseUrl` from the electron-app tsconfig, and switched the variable
font side-effect imports to explicit `.css` paths to satisfy TS6's new
TS2882 check.
