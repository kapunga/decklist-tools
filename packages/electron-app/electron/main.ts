import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, protocol, session, shell, type MenuItemConstructorOptions } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { Storage, loadCardDeckLimits, buildArtCropUrlFromId, getFormat } from '@mtg-deckbuilder/shared'
import type { Deck, Taxonomy, CardList, Config, RoleDefinition, SetCollectionFile, PullListConfig } from '@mtg-deckbuilder/shared'
import {
  watchForChanges,
  exportCollection,
  importCollection,
  preCacheDeck,
  loadAllCardsToCache,
  cancelCacheLoad,
  readSettingsWindowState,
  writeSettingsWindowState,
  updateSettingsActiveSection,
  SETTINGS_WINDOW_DEFAULTS,
} from './storage-extensions'
import { createSkillsModule, getBundledSkillsDir, type SkillClientId } from './skills'
import {
  readConfig,
  writeConfig,
  upsertMcpServer,
  removeMcpServer,
  hasMcpServer,
  type McpConfigFormat,
  type McpServerDef,
} from './mcp-config'

// MCP client integration
type McpClientId = 'claude-desktop' | 'claude-code' | 'gemini-cli' | 'openai-codex'

/** How to read, merge into, and write a given client's MCP config file. */
interface McpClientSpec {
  configPath: string
  format: McpConfigFormat
  // Top-level key the server list lives under: the JSON clients use
  // `mcpServers`; Codex (TOML) uses `mcp_servers`.
  serversKey: string
}

function getMcpServerName(): string {
  return app.isPackaged ? 'mtg-deckbuilder' : 'mtg-deckbuilder-dev'
}

// In dev, __dirname is <repo>/packages/electron-app/dist-electron.
function getRepoRoot(): string {
  return path.resolve(__dirname, '..', '..', '..')
}

function getStorageDir(): string {
  if (app.isPackaged) {
    return path.join(app.getPath('appData'), 'mtg-deckbuilder')
  }
  return path.join(getRepoRoot(), 'dev-storage')
}

function getClaudeDesktopConfigPath(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json')
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    default:
      return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json')
  }
}

/**
 * Per-client config specs. The three JSON clients share the repo's `.mcp.json`
 * in dev; Codex always targets its own TOML at `~/.codex/config.toml` (the file
 * `codex mcp add` manages), merging in rather than overwriting the user's model
 * and provider settings.
 */
function getMcpClientSpecs(): Record<McpClientId, McpClientSpec> {
  const json = (configPath: string): McpClientSpec => ({
    configPath,
    format: 'json',
    serversKey: 'mcpServers',
  })
  const codex: McpClientSpec = {
    configPath: path.join(os.homedir(), '.codex', 'config.toml'),
    format: 'toml',
    serversKey: 'mcp_servers',
  }

  if (!app.isPackaged) {
    const devConfig = path.join(getRepoRoot(), '.mcp.json')
    return {
      'claude-desktop': json(devConfig),
      'claude-code': json(devConfig),
      'gemini-cli': json(devConfig),
      'openai-codex': codex,
    }
  }
  return {
    'claude-desktop': json(getClaudeDesktopConfigPath()),
    'claude-code': json(path.join(os.homedir(), '.claude', 'settings.local.json')),
    'gemini-cli': json(path.join(os.homedir(), '.gemini', 'settings.json')),
    'openai-codex': codex,
  }
}

function getMcpServerPath(): string {
  // In production, the MCP server is bundled with the app
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'mcp-server', 'main.js')
  }
  // In development, use the dist path
  return path.join(__dirname, '../../mcp-server/dist/main.js')
}

/** The MCP server entry (command + args) written into every client config. */
function buildMcpServerDef(): McpServerDef {
  const mcpServerPath = getMcpServerPath()
  // Pass `--skills-dir` so the server's list_bundled_skills tool can read the
  // same SKILL.md files the Settings → Skills table installs from.
  const skillsDir = getBundledSkillsDir(getRepoRoot())
  const baseArgs = app.isPackaged
    ? [mcpServerPath]
    : [mcpServerPath, '--storage-dir', getStorageDir()]
  return { command: 'node', args: [...baseArgs, '--skills-dir', skillsDir] }
}

function registerMcpHandlers(clientId: string, spec: McpClientSpec): void {
  const { configPath, format, serversKey } = spec

  ipcMain.handle(`mcp:${clientId}:status`, async () => {
    const config = readConfig(format, configPath)
    return {
      connected: config ? hasMcpServer(config, serversKey, getMcpServerName()) : false,
      configPath,
      mcpServerPath: getMcpServerPath(),
    }
  })

  ipcMain.handle(`mcp:${clientId}:connect`, async () => {
    try {
      const config = readConfig(format, configPath) ?? {}
      const updated = upsertMcpServer(config, serversKey, getMcpServerName(), buildMcpServerDef())
      writeConfig(format, configPath, updated)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle(`mcp:${clientId}:disconnect`, async () => {
    try {
      const config = readConfig(format, configPath)
      if (!config) return { success: true }
      writeConfig(format, configPath, removeMcpServer(config, serversKey, getMcpServerName()))
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

// Global error handlers — prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let storage: Storage | null = null

// Register custom protocol for serving cached images
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cached-image',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
])

const createWindow = () => {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
  }

  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset'
    windowOptions.trafficLightPosition = { x: 15, y: 15 }
  }

  mainWindow = new BrowserWindow(windowOptions)

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

function createOrFocusMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    return
  }
  createWindow()
}

// Open the Settings window, or focus it if it already exists. Triggered by
// the menu's Settings… item (Cmd+,) and the gear icon's `settings:open` IPC.
function createOrFocusSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.focus()
    return
  }
  createSettingsWindow()
}

function createSettingsWindow(): void {
  const persisted = storage ? readSettingsWindowState(storage) : null

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    title: 'Settings',
    width: persisted?.width ?? SETTINGS_WINDOW_DEFAULTS.width,
    height: persisted?.height ?? SETTINGS_WINDOW_DEFAULTS.height,
    minWidth: SETTINGS_WINDOW_DEFAULTS.minWidth,
    minHeight: SETTINGS_WINDOW_DEFAULTS.minHeight,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1d1d1f' : '#f6f6f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  }

  if (typeof persisted?.x === 'number' && typeof persisted?.y === 'number') {
    windowOptions.x = persisted.x
    windowOptions.y = persisted.y
  }

  settingsWindow = new BrowserWindow(windowOptions)

  const initialSection = persisted?.activeSection
  const searchSuffix = initialSection ? `&section=${encodeURIComponent(initialSection)}` : ''

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=settings${searchSuffix}`)
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      search: `view=settings${searchSuffix}`,
    })
  }

  // The shared index.html has <title>MTG Deckbuilder</title>. Prevent it
  // from overriding the constructor's title so the Window menu and switcher
  // can distinguish this window as "Settings".
  settingsWindow.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  settingsWindow.on('close', () => {
    if (!storage || !settingsWindow) return
    const bounds = settingsWindow.getBounds()
    const existing = readSettingsWindowState(storage)
    try {
      writeSettingsWindowState(storage, {
        ...bounds,
        activeSection: existing?.activeSection,
      })
    } catch (error) {
      console.error('Failed to persist settings window state:', error)
    }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// Ensure the app menu shows the correct name (Electron uses package.json "name" by default)
app.setName('MTG Deckbuilder')

// Send a `menu:action` event to the active renderer. Listeners in
// packages/electron-app/src/App.tsx switch on the action and dispatch the
// matching store/UI change. Targets the main window only — menu actions
// drive deck operations, not Settings.
function sendMenuAction(action: string, payload?: unknown): void {
  if (!mainWindow) return
  mainWindow.webContents.send('menu:action', action, payload)
}

// Broadcast an IPC event to every renderer window. Used for state-sync
// channels (`storage:changed`, `cache:load-progress`) that any window may
// be listening to.
function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}

const GITHUB_URL = 'https://github.com/kapunga/decklist-tools'
const DOCS_URL = 'https://kapunga.github.io/decklist-tools/'

function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin'

  // macOS App menu — built manually so we can insert Settings… (Cmd+,)
  // between About and Services, the conventional macOS Preferences slot.
  const macAppSubmenu: MenuItemConstructorOptions[] = [
    { role: 'about' },
    { type: 'separator' },
    { label: 'Settings…', accelerator: 'Cmd+,', click: () => createOrFocusSettingsWindow() },
    { type: 'separator' },
    { role: 'services' },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideOthers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' },
  ]

  const fileSubmenu: MenuItemConstructorOptions[] = [
    { label: 'New Deck', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new-deck') },
    { label: 'Import Deck…', accelerator: 'CmdOrCtrl+I', click: () => sendMenuAction('import-deck') },
    { id: 'export-deck', label: 'Export Deck…', accelerator: 'CmdOrCtrl+E', enabled: false, click: () => sendMenuAction('export-deck') },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ]

  const editSubmenu: MenuItemConstructorOptions[] = [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'selectAll' },
    { type: 'separator' },
    { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendMenuAction('focus-search') },
    ...(isMac
      ? []
      : [
          { type: 'separator' as const },
          { label: 'Preferences…', accelerator: 'Ctrl+,', click: () => createOrFocusSettingsWindow() },
        ]),
  ]

  const viewSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'Theme',
      submenu: [
        { label: 'Library', click: () => sendMenuAction('set-theme', 'library') },
        { label: 'Fantasy', click: () => sendMenuAction('set-theme', 'fantasy') },
        { label: 'Steampunk', click: () => sendMenuAction('set-theme', 'steampunk') },
        { label: 'Ukiyoe', click: () => sendMenuAction('set-theme', 'ukiyoe') },
        { label: 'Cyberpunk', click: () => sendMenuAction('set-theme', 'cyberpunk') },
        { label: 'Gothic', click: () => sendMenuAction('set-theme', 'gothic') },
      ],
    },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
    { role: 'toggleDevTools' },
  ]

  const windowSubmenu: MenuItemConstructorOptions[] = [
    { role: 'minimize' },
    { role: 'zoom' },
    ...(isMac
      ? [{ type: 'separator' as const }, { role: 'front' as const }]
      : []),
    { type: 'separator' },
    { label: 'MTG Deckbuilder', click: () => createOrFocusMainWindow() },
  ]

  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'About MTG Deckbuilder',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About MTG Deckbuilder',
          message: 'MTG Deckbuilder',
          detail: `Version ${app.getVersion()}\nA local-first deck management tool for Magic: The Gathering.`,
          buttons: ['OK'],
        })
      },
    },
    { label: 'View on GitHub', click: () => shell.openExternal(GITHUB_URL) },
    { label: 'Documentation', click: () => shell.openExternal(DOCS_URL) },
  ]

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ label: app.name, submenu: macAppSubmenu }] : []),
    { label: 'File', submenu: fileSubmenu },
    { label: 'Edit', submenu: editSubmenu },
    { label: 'View', submenu: viewSubmenu },
    { label: 'Window', submenu: windowSubmenu, role: 'window' },
    { role: 'help', submenu: helpSubmenu },
  ]

  return Menu.buildFromTemplate(template)
}

app.whenReady().then(async () => {
  storage = new Storage(getStorageDir())

  // Load card-intrinsic deck limits ("A deck can have..." cards). Non-blocking:
  // failures are logged but never throw, so the app always proceeds.
  await loadCardDeckLimits({
    cachePath: path.join(storage.getBasePath(), 'cache', 'deck-limits.json'),
  })

  // Set Content Security Policy (production only - Vite dev server needs more permissive settings)
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'", // Needed for Tailwind/CSS-in-JS
              "img-src 'self' https://cards.scryfall.io https://svgs.scryfall.io https://api.scryfall.com cached-image: data:",
              "connect-src 'self' https://api.scryfall.com",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          ]
        }
      })
    })
  }

  // Register protocol handler for cached images
  // URL format: cached-image://cache/{scryfallId}[_{face}].jpg
  protocol.handle('cached-image', (request) => {
    // Parse the URL - format is cached-image://cache/filename.jpg
    // pathname will be /filename.jpg
    const url = new URL(request.url)
    const filename = decodeURIComponent(url.pathname.slice(1)) // Remove leading /

    if (!storage) {
      return new Response('Storage not initialized', { status: 500 })
    }

    if (!filename || filename.includes('..')) {
      return new Response('Invalid filename', { status: 400 })
    }

    const imagePath = path.join(storage.getImageCacheDir(), filename)

    // Security check: ensure the path is within the cache directory
    const normalizedPath = path.normalize(imagePath)
    const cacheDir = storage.getImageCacheDir()
    if (!normalizedPath.startsWith(cacheDir)) {
      return new Response('Access denied', { status: 403 })
    }

    if (!fs.existsSync(imagePath)) {
      return new Response('Image not found', { status: 404 })
    }

    // Read the file and return as Response with proper content type
    const imageBuffer = fs.readFileSync(imagePath)
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(imageBuffer.length)
      }
    })
  })

  setupIpcHandlers()
  Menu.setApplicationMenu(buildAppMenu())
  createWindow()

  app.on('activate', () => {
    createOrFocusMainWindow()
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
    return storage!.saveDeck(deck as Deck)
  })

  ipcMain.handle('decks:delete', async (_, id: string) => {
    return storage!.deleteDeck(id)
  })

  // Taxonomy
  ipcMain.handle('taxonomy:get', async () => {
    return storage!.getTaxonomy()
  })

  ipcMain.handle('taxonomy:save', async (_, taxonomy: unknown) => {
    return storage!.saveTaxonomy(taxonomy as Taxonomy)
  })

  // Card Lists
  ipcMain.handle('lists:list', async () => {
    return storage!.listCardLists()
  })

  ipcMain.handle('lists:get', async (_, id: string) => {
    return storage!.getCardList(id)
  })

  ipcMain.handle('lists:save', async (_, list: unknown) => {
    return storage!.saveCardList(list as CardList)
  })

  ipcMain.handle('lists:delete', async (_, id: string) => {
    return storage!.deleteCardList(id)
  })

  // Config
  ipcMain.handle('config:get', async () => {
    return storage!.getConfig()
  })

  ipcMain.handle('config:save', async (_, config: unknown) => {
    return storage!.saveConfig(config as Config)
  })

  // Global Roles
  ipcMain.handle('global-roles:get', async () => {
    return storage!.getGlobalRoles()
  })

  ipcMain.handle('global-roles:save', async (_, roles: unknown[]) => {
    return storage!.saveGlobalRoles(roles as RoleDefinition[])
  })

  // Set Collection
  ipcMain.handle('set-collection:get', async () => {
    return storage!.getSetCollection()
  })

  ipcMain.handle('set-collection:save', async (_, collection: unknown) => {
    return storage!.saveSetCollection(collection as SetCollectionFile)
  })

  // Pull List Config
  ipcMain.handle('pull-list-config:get', async () => {
    return storage!.getPullListConfig()
  })

  ipcMain.handle('pull-list-config:save', async (_, config: unknown) => {
    return storage!.savePullListConfig(config as PullListConfig)
  })

  // Watch for file changes
  watchForChanges(storage, (event, filename) => {
    broadcast('storage:changed', { event, filename })
  })

  // MCP client integrations
  for (const [clientId, spec] of Object.entries(getMcpClientSpecs())) {
    registerMcpHandlers(clientId, spec)
  }

  // Skill installation (Claude Code + Gemini CLI: filesystem-copy into the
  // client's skills dir; 'manual': zip-export through a save dialog for
  // Claude Desktop's Capabilities UI or any other harness).
  const skillsModule = createSkillsModule({
    repoRoot: getRepoRoot(),
    storageDir: getStorageDir(),
  })
  const skillClients: SkillClientId[] = ['claude-code', 'gemini-cli', 'openai-codex', 'manual']
  for (const clientId of skillClients) {
    skillsModule.registerHandlers(clientId)
  }

  // Cache management
  ipcMain.handle('cache:stats', async () => {
    return storage!.getCacheStats()
  })

  ipcMain.handle('cache:clear-json', async () => {
    storage!.clearJsonCache()
  })

  ipcMain.handle('cache:clear-images', async () => {
    storage!.clearImageCache()
  })

  ipcMain.handle('cache:clear-all', async () => {
    storage!.clearAllCache()
  })

  ipcMain.handle('cache:rebuild-index', async () => {
    return storage!.rebuildCacheIndex()
  })

  ipcMain.handle('cache:pre-cache-deck', async (_, deckId: string, includeImages: boolean) => {
    return preCacheDeck(storage!, deckId, includeImages)
  })

  ipcMain.handle('cache:get-image-path', async (_, scryfallId: string, face?: string) => {
    return storage!.getCachedImagePath(scryfallId, face as 'front' | 'back' | undefined)
  })

  // Cache-or-fetch for art crops: returns a `cached-image://` URL on success,
  // or null on network failure (renderer falls back to the direct CDN URL).
  // Only fetches once per id+face — subsequent calls hit the local file.
  ipcMain.handle('cache:get-or-fetch-art-crop', async (_, scryfallId: string, face?: string) => {
    if (!storage) return null
    const resolvedFace = (face === 'back' ? 'back' : 'front') as 'front' | 'back'
    const filename = resolvedFace === 'back' ? `${scryfallId}_back.jpg` : `${scryfallId}.jpg`
    const cacheUrl = `cached-image://cache/art-crops/${encodeURIComponent(filename)}`

    if (storage.getCachedArtCropPath(scryfallId, resolvedFace)) return cacheUrl

    try {
      const response = await fetch(buildArtCropUrlFromId(scryfallId, resolvedFace))
      if (!response.ok) return null
      const buffer = Buffer.from(await response.arrayBuffer())
      storage.cacheArtCrop(scryfallId, buffer, resolvedFace)
      return cacheUrl
    } catch (error) {
      console.error(`Error fetching art crop for ${scryfallId} (${resolvedFace}):`, error)
      return null
    }
  })

  ipcMain.handle('cache:get-cards', async (_, scryfallIds: string[]) => {
    const result: Record<string, unknown> = {}
    for (const id of scryfallIds) {
      const cached = storage!.getCachedCard(id)
      if (cached) result[id] = cached
    }
    return result
  })

  ipcMain.handle('cache:save-cards', async (_, cards: unknown[]) => {
    try {
      storage!.cacheCardsWithIndex(cards as Parameters<typeof storage.cacheCardsWithIndex>[0])
    } catch (error) {
      console.error('Failed to cache scryfall cards:', error)
    }
  })

  ipcMain.handle('cache:load-all', async (_, includeImages: boolean) => {
    await loadAllCardsToCache(storage!, includeImages, (progress) => {
      broadcast('cache:load-progress', progress)
    })
  })

  ipcMain.handle('cache:load-cancel', async () => {
    cancelCacheLoad()
  })

  // Collection export/import
  ipcMain.handle('collection:export', async () => {
    try {
      const date = new Date().toISOString().split('T')[0]
      const result = await dialog.showSaveDialog({
        title: 'Export Collection',
        defaultPath: `mtg-collection-${date}.mtgbackup`,
        filters: [
          { name: 'MTG Backup', extensions: ['mtgbackup'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true }
      }

      const data = exportCollection(storage!)
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, filePath: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Deck export — write a rendered decklist to a user-chosen file.
  ipcMain.handle('deck:export-save', async (_, args: { deckId: string; format: string; includeSideboard?: boolean; includeMaybeboard?: boolean; section?: 'mainboard' | 'sideboard' | 'maybeboard' }) => {
    try {
      if (!storage) return { success: false, error: 'Storage not initialized' }
      const deck = storage.getDeck(args.deckId)
      if (!deck) return { success: false, error: `Deck not found: ${args.deckId}` }
      const format = getFormat(args.format)
      if (!format) return { success: false, error: `Unknown format: ${args.format}` }

      const content = format.render(deck, {
        includeSideboard: args.includeSideboard ?? true,
        includeMaybeboard: args.includeMaybeboard ?? true,
        section: args.section,
      })

      const safeName = deck.name.replace(/[^A-Za-z0-9._ -]+/g, '_').trim() || 'deck'
      const sectionSuffix = args.section ? `.${args.section}` : ''
      const result = await dialog.showSaveDialog({
        title: `Export Deck — ${format.name}${args.section ? ` (${args.section})` : ''}`,
        defaultPath: `${safeName}.${format.id}${sectionSuffix}.txt`,
        filters: [
          { name: 'Text', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true }
      }

      fs.writeFileSync(result.filePath, content, 'utf-8')
      return { success: true, filePath: result.filePath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Menu enable/disable for "Export Deck" item — renderer toggles this when
  // entering or leaving a deck-detail view.
  ipcMain.handle('menu:set-export-enabled', (_, enabled: boolean) => {
    const item = Menu.getApplicationMenu()?.getMenuItemById('export-deck')
    if (item) item.enabled = enabled
  })

  ipcMain.handle('settings:open', () => {
    createOrFocusSettingsWindow()
  })

  ipcMain.handle('settings:save-active-section', (_, section: string) => {
    if (!storage) return
    try {
      updateSettingsActiveSection(storage, section)
    } catch (error) {
      console.error('Failed to persist settings active section:', error)
    }
  })

  ipcMain.handle('collection:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Collection',
        filters: [
          { name: 'MTG Backup', extensions: ['mtgbackup'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true }
      }

      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(content)

      if (!data.formatVersion) {
        return { success: false, error: 'Invalid backup file: missing formatVersion' }
      }

      const importResult = importCollection(storage!, data)
      return {
        success: true,
        deckCount: importResult.deckCount,
        warnings: importResult.warnings
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}
