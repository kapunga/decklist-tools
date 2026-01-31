# Gemini CLI Integration Plan

> **Status**: Future work - saved for when ready to implement

## Goal
Add Gemini CLI support alongside the existing Claude Desktop integration, allowing users to connect the MCP server to either (or both) AI assistants.

## Research Findings

### Gemini CLI MCP Support
Gemini CLI fully supports MCP servers using the same protocol as Claude Desktop. The MCP server code requires **no changes** - only the Electron app's configuration management needs updating.

### Configuration Comparison

| Aspect | Claude Desktop | Gemini CLI |
|--------|---------------|------------|
| Config file (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` | `~/.gemini/settings.json` |
| Config file (Windows) | `%APPDATA%\Claude\...` | `%APPDATA%\.gemini\settings.json` |
| Config file (Linux) | N/A (no Linux support) | `~/.gemini/settings.json` |
| Root key | `mcpServers` | `mcpServers` |
| Server entry format | `{ command, args }` | `{ command, args, env?, timeout?, trust? }` |

### Gemini CLI Config Example
```json
{
  "mcpServers": {
    "mtg-deckbuilder": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/main.js"]
    }
  }
}
```

The format is essentially identical to Claude Desktop, so the same connection logic can be reused with different file paths.

---

## Implementation Plan

### Files to Modify

1. **`packages/electron-app/electron/main.ts`**
   - Add `GEMINI_CONFIG_PATH` constant for each platform
   - Add `getGeminiConfig()` and `saveGeminiConfig()` functions (mirror Claude functions)
   - Add IPC handlers: `gemini:status`, `gemini:connect`, `gemini:disconnect`

2. **`packages/electron-app/electron/preload.ts`**
   - Add `getGeminiConnectionStatus()`, `connectGeminiCli()`, `disconnectGeminiCli()` to exposed API
   - Update `ElectronAPI` interface

3. **`packages/electron-app/src/components/SettingsPage.tsx`**
   - Add Gemini CLI section (duplicate Claude section with different branding)
   - Add state: `geminiConnected`, `geminiLoading`, `geminiError`
   - Add handlers: `handleConnectGemini`, `handleDisconnectGemini`

---

## Detailed Changes

### 1. main.ts additions

```typescript
// Platform-specific Gemini config paths
function getGeminiConfigPath(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', '.gemini', 'settings.json')
    case 'darwin':
    case 'linux':
    default:
      return path.join(os.homedir(), '.gemini', 'settings.json')
  }
}

// Mirror the Claude functions for Gemini
function getGeminiConfig(): GeminiConfig | null { ... }
function saveGeminiConfig(config: GeminiConfig): void { ... }

// IPC handlers
ipcMain.handle('gemini:status', async () => { ... })
ipcMain.handle('gemini:connect', async () => { ... })
ipcMain.handle('gemini:disconnect', async () => { ... })
```

### 2. preload.ts additions

```typescript
// Add to contextBridge.exposeInMainWorld
getGeminiConnectionStatus: () => ipcRenderer.invoke('gemini:status'),
connectGeminiCli: () => ipcRenderer.invoke('gemini:connect'),
disconnectGeminiCli: () => ipcRenderer.invoke('gemini:disconnect')
```

### 3. SettingsPage.tsx UI

Add a second integration card below Claude Desktop:
- Icon: Gemini logo or generic terminal icon
- Title: "Gemini CLI Integration"
- Status: Connected/Not Connected
- Button: Connect/Disconnect
- Note about restarting Gemini CLI

---

## Optional Enhancements

### Refactor for DRYness
Extract shared connection logic into a reusable helper:

```typescript
interface McpClientConfig {
  name: string
  configPath: string
  serverName: string
}

function createMcpClientHandlers(config: McpClientConfig) {
  return {
    getStatus: () => { ... },
    connect: () => { ... },
    disconnect: () => { ... }
  }
}
```

This would reduce duplication if adding more MCP clients in the future.

### Cross-Platform Support
The Gemini CLI paths already handle Windows and Linux. To fully support these platforms:
- Update Claude Desktop path detection for Windows
- Add platform detection for storage paths in shared package
- Update electron-builder for Windows/Linux targets

---

## Verification

1. **Build**: `pnpm build`
2. **Run dev**: `pnpm dev`
3. **Test Claude connection**: Click "Connect to Claude" in Settings, verify config file updated
4. **Test Gemini connection**: Click "Connect to Gemini CLI" in Settings, verify `~/.gemini/settings.json` updated
5. **Test Gemini CLI**: Run `gemini` in terminal, verify MCP tools are available
6. **Test both simultaneously**: Both should work independently

---

## Scope

**In scope:**
- Gemini CLI connection UI in Settings
- IPC handlers for Gemini config management
- Platform-aware config paths (macOS, Linux, Windows)

**Out of scope:**
- Windows/Linux Electron builds (separate effort)
- ChatGPT integration (requires different architecture)
- Cloud sync features

---

## Sources

- [MCP servers with the Gemini CLI](https://geminicli.com/docs/tools/mcp-server/)
- [Gemini CLI configuration](https://geminicli.com/docs/get-started/configuration/)
