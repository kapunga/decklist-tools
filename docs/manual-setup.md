# Manual setup

Everything the one-click buttons in **Settings → MCP Server** and **Settings → Skills** do, you can do by hand. You'd reach for this if you're connecting an assistant that isn't one of the one-click options, you're on a machine where you'd rather not let the app edit config files, or you just want to see exactly what's being changed. There are two things to wire up: pointing your assistant at the **MCP server**, and — optionally, but strongly recommended — installing the **skills**.

::: tip Node.js required
The MCP server runs under `node`, so the snippets below assume **Node.js** is installed and on your `PATH`. If your assistant reports that it can't find `node`, replace `node` in the `command` with the full path to your node binary (find it with `which node` on macOS/Linux or `where node` on Windows).
:::

## Step 1 — Locate the bundled MCP server

The desktop app ships the MCP server and the skill files inside its install directory. You'll point your assistant's config at the server's `main.js`, and (in Step 3) copy skills out of the bundled `skills` folder.

| OS | MCP server (`main.js`) | Bundled skills folder |
|---|---|---|
| **macOS** | `/Applications/MTG Deckbuilder.app/Contents/Resources/mcp-server/main.js` | `/Applications/MTG Deckbuilder.app/Contents/Resources/skills` |
| **Windows** | `%LOCALAPPDATA%\Programs\MTG Deckbuilder\resources\mcp-server\main.js` | `%LOCALAPPDATA%\Programs\MTG Deckbuilder\resources\skills` |
| **Linux** (AppImage) | extract first (below), then `squashfs-root/resources/mcp-server/main.js` | `squashfs-root/resources/skills` |

A few notes:

- **Windows:** the path above is the default install location. If you chose a different folder during setup, look under `…\resources\` wherever the app installed.
- **Linux:** an AppImage isn't a normal folder — it mounts itself at runtime, so there's no stable path to its contents. Extract it once with `./MTG-Deckbuilder-*.AppImage --appimage-extract`, which produces a `squashfs-root/` directory you can point at.
- **Built from source?** The server is `packages/mcp-server/dist/main.js` and the skills are in `skills/` at the repo root.

The rest of this page writes these as **`<MCP_SERVER>`** (your `main.js` path) and **`<SKILLS_DIR>`** (your bundled skills folder). Substitute the values for your OS.

## Step 2 — Add the MCP server to your assistant

Each assistant keeps its MCP server list in a config file. Find the file for your assistant and OS, then add the `mtg-deckbuilder` entry. The first three assistants use JSON (an `mcpServers` object); Codex uses TOML.

### Config file locations

| Assistant | macOS | Windows | Linux |
|---|---|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` | `~/.config/Claude/claude_desktop_config.json` |
| **Claude Code** | `~/.claude/settings.local.json` | `%USERPROFILE%\.claude\settings.local.json` | `~/.claude/settings.local.json` |
| **Gemini CLI** | `~/.gemini/settings.json` | `%USERPROFILE%\.gemini\settings.json` | `~/.gemini/settings.json` |
| **OpenAI Codex CLI** | `~/.codex/config.toml` | `%USERPROFILE%\.codex\config.toml` | `~/.codex/config.toml` |

### JSON assistants — Claude Desktop, Claude Code, Gemini CLI

Add this to the config file. If the file already exists and has an `mcpServers` object, add `mtg-deckbuilder` **alongside** the existing entries rather than replacing the whole object:

```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "node",
      "args": ["<MCP_SERVER>", "--skills-dir", "<SKILLS_DIR>"]
    }
  }
}
```

### Codex CLI — TOML

The easiest route is Codex's own command, which merges the entry in without disturbing your model or provider settings:

```bash
codex mcp add mtg-deckbuilder -- node "<MCP_SERVER>" --skills-dir "<SKILLS_DIR>"
```

Or add the table to `~/.codex/config.toml` by hand — note the key is `mcp_servers` (with an underscore), because Codex uses TOML rather than JSON:

```toml
[mcp_servers.mtg-deckbuilder]
command = "node"
args = ["<MCP_SERVER>", "--skills-dir", "<SKILLS_DIR>"]
```

::: warning Codex CLI, not the ChatGPT app
This is the Codex *command-line* tool. The ChatGPT desktop app can only connect to remote, hosted MCP connectors — it can't reach a local server like this one — so it isn't an option for driving your decks.
:::

Restart the assistant after editing its config so it picks up the new server.

## Step 3 — Install the skills

The MCP server gives an assistant the tools; the skills teach it how to use them well. Each skill is just a folder — a `<skill-name>/SKILL.md` directory — inside the bundled skills folder from Step 1. Installing one means copying that folder into the assistant's skills directory.

### Filesystem assistants — Claude Code, Gemini CLI, Codex CLI

Copy the skill folders from `<SKILLS_DIR>` into the assistant's skills directory:

| Assistant | Skills directory |
|---|---|
| **Claude Code** | `~/.claude/skills/` |
| **Gemini CLI** | `~/.gemini/skills/` |
| **OpenAI Codex CLI** | `~/.codex/skills/` |

On Windows, `~` is `%USERPROFILE%` — e.g. `%USERPROFILE%\.codex\skills\`.

For example, on macOS, to install all of the skills for the Codex CLI:

```bash
mkdir -p ~/.codex/skills
cp -R "/Applications/MTG Deckbuilder.app/Contents/Resources/skills/"* ~/.codex/skills/
```

Restart the assistant and it will pick the skills up automatically. To check whether installed copies are current, ask the assistant to run the **`list_bundled_skills`** tool — it reports the version the running app ships, which you can compare against the `metadata.version` in your installed `SKILL.md` files.

### Claude Desktop

Claude Desktop doesn't read skills off the filesystem. Use the desktop app's **Settings → Skills → Save…** to export the skills as a `.zip`, then upload that file under Claude Desktop's own **Capabilities** settings.

---

Using the desktop app? All of this is one click each in **Settings → MCP Server** and **Settings → Skills** — see [Building with AI assistants](/usage-mcp) and [Skills](/skills) for the guided version.
