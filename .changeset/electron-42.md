---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Electron 42.

Bumps Electron from 41.3.0 → 42.x (#174 brought 42.1.0; subsequent dev-dependency-group bumps tracked 42.2.0). Electron is the desktop runtime shipped with the app, so this is a major-version change to the production runtime: a new Chromium baseline, a new V8 / Node bundled inside, and the matching electron-builder framework metadata.

No code changes were required at our level — the existing main-process, renderer, and IPC surface continued to typecheck and run unchanged across the upgrade — but downstream users should be aware that a fresh install of the app pulls in a different Chromium engine, with the usual implications (TLS / cipher list, CSS feature support, web-platform APIs, and OS minimum requirements track Electron's release notes).
