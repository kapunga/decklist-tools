---
"@mtg-deckbuilder/shared": minor
"@mtg-deckbuilder/mcp-server": minor
"@mtg-deckbuilder/electron-app": minor
---

Install bundled skills into Claude Code, Gemini CLI, or any other harness from Settings.

The app now ships with six SKILL.md skills under `skills/` and surfaces them in a new Settings → Skills section. Each skill can be installed per-client into `~/.claude/skills/` or `~/.gemini/skills/`, or exported as a `.zip` for Claude Desktop's Capabilities UI / any harness that reads SKILL.md bundles.

### Behavior changes

- New **Skills** sidebar section in Settings with a table: one row per bundled skill, three action columns (Claude Code, Gemini CLI, Export), and an "All skills" bulk-action header row.
- The previous **Integrations** section has been renamed to **MCP Server** and now contains only the three MCP connection cards. The previous `integrations` persisted section key migrates transparently to `mcp-server`.
- Per-skill info button surfaces the SKILL.md `description:` frontmatter as a hover tooltip.
- Install state is tracked in a new `skills-installed.json` manifest under the user's storage directory. Uninstall only removes skills the app installed — third-party skills in the same target directory are never touched.

### Versioning

- Skills carry a `metadata.version` field per the [agentskills.io spec](https://agentskills.io/specification). The current convention is date-based (`metadata.version: "YYYY-MM-DD"`); bump it when the SKILL.md content meaningfully changes.
- The Settings table compares each skill's bundled version against the installed version and surfaces an **Update** button when they differ. Skills without a `version:` field fall back to the app version.

### Staleness check from inside a session

A new MCP tool, `list_bundled_skills`, returns the currently-bundled skill inventory (`name`, `version`, `description`) so an installed skill (or the user) can ask "is my local copy current?" without leaving the chat. Compare the returned `version` against the `metadata.version` in your local SKILL.md and reinstall through Settings → Skills if newer. The tool reads from the same `skills/` directory the Electron app installs from; Electron passes `--skills-dir` when it spawns the MCP server. Existing MCP integrations need to disconnect + reconnect in Settings → MCP Server to pick up the new flag.

### Notes

- Claude Desktop currently has no documented filesystem skills directory; the Export column writes a `.zip` via a save dialog and reveals it in Finder for manual upload to Claude Desktop's Capabilities UI.
- The bundled `skills/` directory ships as a packaged-app resource via electron-builder's `extraResources`.
- New runtime dep: `archiver` (pinned to `^7.0.1` — v8 is ESM-only and breaks the factory-function API).
- SKILL.md descriptions must not contain angle-bracket placeholders (e.g. `function:<tag>`) — Claude Desktop's uploader rejects them as XML. Drop the placeholder or describe in plain words.
