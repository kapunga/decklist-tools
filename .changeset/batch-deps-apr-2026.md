---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Dependency maintenance batch covering the dependabot merges from
2026-04-14 and 2026-04-15:

- **Tailwind CSS 3.4 → 4.2.** The v4 PostCSS plugin moved to a separate
  package, breaking a fresh install. Switched the electron-app to the
  official `@tailwindcss/vite` plugin and dropped `autoprefixer` and
  `postcss` (v4 handles vendor prefixing internally via Lightning CSS).
  The existing `tailwind.config.js` is still loaded via an `@config`
  directive in `globals.css`, so shadcn/ui theme variables, Radix
  keyframes, and the custom border-radius scale carry over unchanged.
  Removed a v3-era `body { @apply dark; }` rule that v4 rejects — `dark`
  is a variant, not a utility, so this line was a silent no-op under v3.
- **Electron 39 → 41 (major).** Desktop runtime upgrade; no app code
  changes required. Ships with newer Chromium and Node.js.
- **Vite 6 → 8 (major).** Bundler upgrade; integrates cleanly with the
  new `@tailwindcss/vite` plugin. Build output now uses rolldown
  internals, which is why the CSS bundle size shifted.
- **react-router-dom 7.14.0 → 7.14.1** (patch, prod-dependencies group).
