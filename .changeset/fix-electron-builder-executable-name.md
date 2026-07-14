---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix packaging failure after the `electron-builder` 26.15.3 bump. With no explicit `executableName` set, electron-builder derives the packaged binary's name from `package.json`'s `name` field on Linux (`appInfo.sanitizedName`) rather than `productName` — and unlike the sibling `linuxPackageName` getter, that path has no guard for scoped package names, so `@mtg-deckbuilder/electron-app` sanitized down to `@mtg-deckbuilderelectron-app`, an `@`-prefixed name electron-builder now rejects as an unsafe file path. `executableName` is now set explicitly to `mtg-deckbuilder` in the `build` config, so packaging no longer depends on that derivation.
