---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Dependency maintenance.

Production dependencies (electron-app):
- `lucide-react` 0.294.0 → 1.12.0
- `@tanstack/react-query` 5.99.0 → 5.100.6
- `react-router-dom` 7.14.1 → 7.14.2
- `cmdk` 0.2.1 → 1.1.1
- `zustand` 4.5.7 → 5.0.12 (major)
- `uuid` 9.0.1 → 14.0.0 (major; also bumped in shared)

The `zustand` and `uuid` major bumps did not surface breaking changes in
this codebase (typecheck and existing usage continue to work), but both
introduced upstream breaking changes worth noting if usage broadens.

Toolchain (TypeScript 6.0): bumped TypeScript 5.9.3 → 6.0.3 across all
packages and adjusted configs to match TS 6 stricter defaults — added
`"types": ["node"]` to the base tsconfig (TS 6 no longer auto-discovers
hoisted `@types/node` from a parent directory), removed the deprecated
`baseUrl` from the electron-app tsconfig, and switched the variable
font side-effect imports to explicit `.css` paths to satisfy TS6's new
TS2882 check.
