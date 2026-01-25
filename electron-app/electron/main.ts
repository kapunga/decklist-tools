import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { Storage } from './storage'

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

  // Watch for file changes
  storage.watchForChanges((event, filename) => {
    if (mainWindow) {
      mainWindow.webContents.send('storage:changed', { event, filename })
    }
  })
}
