# Installation

## Desktop App (macOS)

1. Download the latest `.dmg` from the [GitHub Releases](https://github.com/kapunga/decklist-tools/releases) page.
2. Open the `.dmg` and drag **MTG Deckbuilder** to your Applications folder.
3. On first launch, macOS may block the app since it is unsigned. To open it:
   - Go to **System Settings > Privacy & Security**
   - Scroll down to the security section
   - Click **Open Anyway** next to the blocked app message
   - Confirm in the dialog that appears

## MCP Server Setup

The MCP server lets Claude Desktop help you build and manage decks. There are two ways to set it up:

### Option 1: Through the Desktop App (recommended)

1. Open the desktop app
2. Go to **Settings**
3. Click **Connect to Claude Desktop**

This automatically configures Claude Desktop to use the MCP server.

### Option 2: Manual Configuration

Add this to your Claude Desktop config file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "node",
      "args": ["/Applications/MTG Deckbuilder.app/Contents/Resources/mcp-server/main.js"]
    }
  }
}
```

Restart Claude Desktop after making config changes.

## Building from Source

Requires Node.js 20+ and pnpm 9.

```bash
git clone https://github.com/kapunga/decklist-tools.git
cd decklist-tools
pnpm install
pnpm dev        # Launch with hot reload
```
