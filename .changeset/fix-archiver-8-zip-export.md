---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Fix skill export build failure after the `archiver` 8.0.0 bump dropped its `default` export. `zipDirectory` now imports the `ZipArchive` class and constructs it directly (`new ZipArchive({ zlib: { level: 9 } })`) instead of calling the removed `archiver('zip', options)` factory function.
