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

The MCP server lets Claude Desktop help you build and manage decks. There are two ways to set it up:

### Option 1: Through the Desktop App (recommended)

1. Open the desktop app
2. Go to **Settings**
3. Click **Connect to Claude Desktop**

This automatically configures Claude Desktop to use the MCP server.

### Option 2: Manual Configuration

Add the MCP server to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "node",
      "args": ["<path-to-app>/mcp-server/main.js"]
    }
  }
}
```

The MCP server path depends on your platform and install location. On macOS, it's typically `/Applications/MTG Deckbuilder.app/Contents/Resources/mcp-server/main.js`.

Restart Claude Desktop after making config changes.

## Building from Source

Requires Node.js >= 22.13.0 and pnpm 10.

```bash
git clone https://github.com/kapunga/decklist-tools.git
cd decklist-tools
pnpm install
pnpm dev        # Launch with hot reload
```
