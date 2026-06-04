# Installation

## Desktop App

<DownloadButton />

1. Download using the button above, or grab the latest release from [GitHub Releases](https://github.com/kapunga/decklist-tools/releases).

### macOS

2. Open the `.dmg` and drag **MTG Deckbuilder** to your Applications folder.
3. On first launch, macOS may block the app since it is unsigned. To open it:
   - Go to **System Settings > Privacy & Security**
   - Scroll down to the security section
   - Click **Open Anyway** next to the blocked app message
   - Confirm in the dialog that appears

### Windows

2. Run the `.exe` installer and follow the prompts.
3. Choose your installation directory (the installer allows customization).

### Linux

2. Make the `.AppImage` executable: `chmod +x MTG-Deckbuilder-*.AppImage`
3. Run it directly: `./MTG-Deckbuilder-*.AppImage`

## MCP Server Setup

The MCP server lets an AI assistant help you build and manage decks. The desktop app connects four assistants — Claude Desktop, Claude Code, Gemini CLI, and the OpenAI Codex CLI — with a single click each, and installs the skills for you too. That's the recommended path:

1. Open the desktop app
2. Go to **Settings → MCP Server**
3. Click **Connect** for the assistant you use

Prefer to wire it up by hand — or connecting an assistant that isn't one of the one-click options? See **[Manual setup](/manual-setup)** for the config-file locations and the exact MCP server and skill snippets for every assistant, on macOS, Windows, and Linux.

## Building from Source

Requires Node.js >= 22.13.0 and pnpm 10.

```bash
git clone https://github.com/kapunga/decklist-tools.git
cd decklist-tools
pnpm install
pnpm dev        # Launch with hot reload
```
