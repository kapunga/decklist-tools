---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Add a theme system with six built-in themes grouped by light/dark mode.

Light: **Library** (default), **Fantasy**, **Steampunk**, **Ukiyo-e**.
Dark: **Cyberpunk**, **Gothic**.

Each theme ships its own shadcn token palette, WUBRG + multicolor + colorless
mana-identity colors (exposed as `--color-w/u/b/r/g/m/c` CSS variables), and
typography stack. Themes are applied as classes on `<html>` (e.g. `theme-library`)
so token switching is a single DOM write.

The Settings page gains an **Appearance** section with a light/dark mode pill
toggle and a card grid that previews each theme's palette strip, name, and
tagline.

All eleven theme fonts (Cinzel, Fraunces, EB Garamond, Playfair Display,
Space Grotesk, JetBrains Mono, Inter, Cormorant Garamond, Instrument Serif,
IBM Plex Serif, IBM Plex Mono) are packaged locally via `@fontsource` /
`@fontsource-variable`, so the app renders correctly on systems without the
fonts installed and works fully offline.

### Config migration

`Config.theme` widens from `'light' | 'dark'` to a `ThemeId` union. A
`normalizeTheme()` pass in storage maps legacy values on read
(`'light'` → `'library'`, `'dark'` → `'gothic'`) and defaults unknown
values to `'library'`. Existing saved configs upgrade transparently on next
load; no user action required.

The storage default for `theme` also changes from `'dark'` to `'library'`
for new installs.
