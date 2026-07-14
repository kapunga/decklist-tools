---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix the packaged macOS `.app` bundle, DMG, and Windows executable being named `mtg-deckbuilder` instead of `MTG Deckbuilder` in v0.12.5. The top-level `executableName` added to fix a Linux-only packaging failure (scoped package name `@mtg-deckbuilder/electron-app` sanitizing to an invalid `@`-prefixed executable name) also fed electron-builder's `productFilename`, which every platform's output artifact naming derives from — not just Linux's. `executableName` is now scoped to `build.linux` only, so Linux packaging still gets an explicit safe name while macOS and Windows artifacts fall back to `productName` ("MTG Deckbuilder") as before.
