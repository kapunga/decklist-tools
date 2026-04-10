---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Split dev and prod storage so development of the app no longer risks production deck data

**Dev storage isolation.** In dev mode (`!app.isPackaged`), the Electron app now reads and writes to `<repo>/dev-storage/` instead of `~/Library/Application Support/mtg-deckbuilder/`. The prod app is unchanged. The dev storage directory is gitignored and created on first launch by the existing `Storage` constructor's `ensureDir` calls.

**Dev MCP server registration.** When the dev Electron app registers its MCP server via the "Connect" buttons in Settings, it now writes to `<repo>/.mcp.json` under the server name `mtg-deckbuilder-dev`, and passes `--storage-dir <repo>/dev-storage` as a CLI arg. This lets Claude Code running inside the repo pick up the dev MCP server automatically without touching the user's global Claude Desktop / Claude Code / Gemini CLI configs, and lets a dev and prod MCP server coexist in the same `.mcp.json` under different server names. The prod registration path is byte-identical to before.

**MCP server `--storage-dir` flag.** The MCP server now accepts a `--storage-dir <path>` CLI argument and passes it to `new Storage(...)`. Invocations without the flag fall back to the default prod path, so existing prod installs are unaffected.

**Bug fix: `loadAllCardsToCache` crash on imported decks.** The "System → Scryfall Cache → Load All Cards" command crashed with `TypeError: deck.cards is not iterable` because two call sites in `packages/electron-app/electron/storage-extensions.ts` still referenced the pre-refactor `deck.cards` / `deck.alternates` / `deck.sideboard` fields. Both now use the `getAllDeckEntries(deck)` accessor from `@mtg-deckbuilder/shared`. This was a latent residue from the card list refactor that only surfaced on the rarely-exercised bulk-cache path.
