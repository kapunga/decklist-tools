---
"@mtg-deckbuilder/shared": patch
"@mtg-deckbuilder/mcp-server": patch
"@mtg-deckbuilder/electron-app": patch
---

Add OpenAI Codex CLI as a one-click assistant. Settings → MCP Server and Settings → Skills now connect and install to Codex (`~/.codex/config.toml` and `~/.codex/skills`). Because Codex stores its config as TOML — alongside the user's model and provider settings — connecting merges the deckbuilder in rather than overwriting; this is covered by new unit tests. Docs updated across the assistants, installation, settings, and skills pages, including a note that the ChatGPT desktop app does not support local MCP servers (use the Codex CLI instead).
