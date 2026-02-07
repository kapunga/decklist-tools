import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { Storage } from './storage'

// Claude Desktop config path
const CLAUDE_CONFIG_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Claude',
  'claude_desktop_config.json'
)

const MCP_SERVER_NAME = 'mtg-deckbuilder'

interface ClaudeConfig {
  mcpServers?: Record<string, { command: string; args?: string[] }>
}

function getClaudeConfig(): ClaudeConfig | null {
  try {
    if (!fs.existsSync(CLAUDE_CONFIG_PATH)) return null
    const content = fs.readFileSync(CLAUDE_CONFIG_PATH, 'utf-8')
    return JSON.parse(content) as ClaudeConfig
  } catch {
    return null
  }
}

function saveClaudeConfig(config: ClaudeConfig): void {
  const dir = path.dirname(CLAUDE_CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2))
}

function getMcpServerPath(): string {
  // In production, the MCP server is bundled with the app
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'mcp-server', 'main.js')
  }
  // In development, use the dist path
  return path.join(__dirname, '../../mcp-server/dist/main.js')
}

let mainWindow: BrowserWindow | null = null
let storage: Storage | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // DevTools can be opened manually with Cmd+Option+I
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  storage = new Storage()
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupIpcHandlers() {
  if (!storage) return

  // Deck operations
  ipcMain.handle('decks:list', async () => {
    return storage!.listDecks()
  })

  ipcMain.handle('decks:get', async (_, id: string) => {
    return storage!.getDeck(id)
  })

  ipcMain.handle('decks:save', async (_, deck: unknown) => {
    return storage!.saveDeck(deck)
  })

  ipcMain.handle('decks:delete', async (_, id: string) => {
    return storage!.deleteDeck(id)
  })

  // Taxonomy
  ipcMain.handle('taxonomy:get', async () => {
    return storage!.getTaxonomy()
  })

  ipcMain.handle('taxonomy:save', async (_, taxonomy: unknown) => {
    return storage!.saveTaxonomy(taxonomy)
  })

  // Interest List
  ipcMain.handle('interest:get', async () => {
    return storage!.getInterestList()
  })

  ipcMain.handle('interest:save', async (_, list: unknown) => {
    return storage!.saveInterestList(list)
  })

  // Config
  ipcMain.handle('config:get', async () => {
    return storage!.getConfig()
  })

  ipcMain.handle('config:save', async (_, config: unknown) => {
    return storage!.saveConfig(config)
  })

  // Global Roles
  ipcMain.handle('global-roles:get', async () => {
    return storage!.getGlobalRoles()
  })

  ipcMain.handle('global-roles:save', async (_, roles: unknown[]) => {
    return storage!.saveGlobalRoles(roles)
  })

  // Set Collection
  ipcMain.handle('set-collection:get', async () => {
    return storage!.getSetCollection()
  })

  ipcMain.handle('set-collection:save', async (_, collection: unknown) => {
    return storage!.saveSetCollection(collection)
  })

  // Pull List Config
  ipcMain.handle('pull-list-config:get', async () => {
    return storage!.getPullListConfig()
  })

  ipcMain.handle('pull-list-config:save', async (_, config: unknown) => {
    return storage!.savePullListConfig(config)
  })

  // Watch for file changes
  storage.watchForChanges((event, filename) => {
    if (mainWindow) {
      mainWindow.webContents.send('storage:changed', { event, filename })
    }
  })

  // Claude Desktop integration
  ipcMain.handle('claude:status', async () => {
    const config = getClaudeConfig()
    const connected = config?.mcpServers?.[MCP_SERVER_NAME] !== undefined
    return {
      connected,
      configPath: CLAUDE_CONFIG_PATH,
      mcpServerPath: getMcpServerPath()
    }
  })

  ipcMain.handle('claude:connect', async () => {
    try {
      let config = getClaudeConfig() || {}
      if (!config.mcpServers) {
        config.mcpServers = {}
      }

      const mcpServerPath = getMcpServerPath()

      // Add our MCP server
      config.mcpServers[MCP_SERVER_NAME] = {
        command: app.isPackaged ? mcpServerPath : 'node',
        args: app.isPackaged ? [] : [mcpServerPath]
      }

      saveClaudeConfig(config)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('claude:disconnect', async () => {
    try {
      const config = getClaudeConfig()
      if (!config?.mcpServers) {
        return { success: true }
      }

      delete config.mcpServers[MCP_SERVER_NAME]
      saveClaudeConfig(config)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}
