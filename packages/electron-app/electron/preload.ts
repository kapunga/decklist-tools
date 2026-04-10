import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Decks
  listDecks: () => ipcRenderer.invoke('decks:list'),
  getDeck: (id: string) => ipcRenderer.invoke('decks:get', id),
  saveDeck: (deck: unknown) => ipcRenderer.invoke('decks:save', deck),
  deleteDeck: (id: string) => ipcRenderer.invoke('decks:delete', id),

  // Taxonomy
  getTaxonomy: () => ipcRenderer.invoke('taxonomy:get'),
  saveTaxonomy: (taxonomy: unknown) => ipcRenderer.invoke('taxonomy:save', taxonomy),

  // Card Lists
  listCardLists: () => ipcRenderer.invoke('lists:list'),
  getCardList: (id: string) => ipcRenderer.invoke('lists:get', id),
  saveCardList: (list: unknown) => ipcRenderer.invoke('lists:save', list),
  deleteCardList: (id: string) => ipcRenderer.invoke('lists:delete', id),

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('config:save', config),

  // Global Roles
  getGlobalRoles: () => ipcRenderer.invoke('global-roles:get'),
  saveGlobalRoles: (roles: unknown[]) => ipcRenderer.invoke('global-roles:save', roles),

  // Set Collection
  getSetCollection: () => ipcRenderer.invoke('set-collection:get'),
  saveSetCollection: (collection: unknown) => ipcRenderer.invoke('set-collection:save', collection),

  // Pull List Config
  getPullListConfig: () => ipcRenderer.invoke('pull-list-config:get'),
  savePullListConfig: (config: unknown) => ipcRenderer.invoke('pull-list-config:save', config),

  // File change events
  onStorageChanged: (callback: (data: { event: string; filename: string }) => void) => {
    ipcRenderer.on('storage:changed', (_, data) => callback(data))
  },
  removeStorageListener: () => {
    ipcRenderer.removeAllListeners('storage:changed')
  },

  // MCP client integrations
  getMcpClientStatus: (clientId: string) => ipcRenderer.invoke(`mcp:${clientId}:status`),
  connectMcpClient: (clientId: string) => ipcRenderer.invoke(`mcp:${clientId}:connect`),
  disconnectMcpClient: (clientId: string) => ipcRenderer.invoke(`mcp:${clientId}:disconnect`),

  // Cache management
  getCacheStats: () => ipcRenderer.invoke('cache:stats'),
  clearJsonCache: () => ipcRenderer.invoke('cache:clear-json'),
  clearImageCache: () => ipcRenderer.invoke('cache:clear-images'),
  clearAllCache: () => ipcRenderer.invoke('cache:clear-all'),
  rebuildCacheIndex: () => ipcRenderer.invoke('cache:rebuild-index'),
  preCacheDeck: (deckId: string, includeImages: boolean) => ipcRenderer.invoke('cache:pre-cache-deck', deckId, includeImages),
  getCachedImagePath: (scryfallId: string, face?: string) => ipcRenderer.invoke('cache:get-image-path', scryfallId, face),
  loadAllCardsToCache: (includeImages: boolean) => ipcRenderer.invoke('cache:load-all', includeImages),
  onCacheProgress: (callback: (progress: CacheLoadProgress) => void) => {
    const handler = (_: unknown, progress: CacheLoadProgress) => callback(progress)
    ipcRenderer.on('cache:load-progress', handler)
    return () => ipcRenderer.removeListener('cache:load-progress', handler)
  },
  cancelCacheLoad: () => ipcRenderer.invoke('cache:load-cancel'),

  // Collection export/import
  exportCollection: () => ipcRenderer.invoke('collection:export'),
  importCollection: () => ipcRenderer.invoke('collection:import'),
})

// Type definitions for the exposed API
export interface McpConnectionStatus {
  connected: boolean
  configPath: string
  mcpServerPath?: string
}

export interface CacheStats {
  jsonCacheCount: number
  jsonCacheSizeBytes: number
  imageCacheCount: number
  imageCacheSizeBytes: number
  totalSizeBytes: number
  oldestEntry?: string
  newestEntry?: string
}

export interface CacheIndex {
  version: number
  updatedAt: string
  byName: Record<string, string>
  bySetCollector: Record<string, string>
  entries: Record<string, unknown>
}

export interface PreCacheResult {
  success: boolean
  cachedCards: number
  cachedImages: number
  errors: string[]
}

export interface CacheLoadProgress {
  phase: 'calculating' | 'loading' | 'complete' | 'cancelled' | 'error'
  totalCards: number
  cachedCards: number
  currentCard?: string
  errors: string[]
}

export interface CollectionExportResult {
  success: boolean
  cancelled?: boolean
  filePath?: string
  error?: string
}

export interface CollectionImportResult {
  success: boolean
  cancelled?: boolean
  deckCount?: number
  warnings?: string[]
  error?: string
}

export interface ElectronAPI {
  listDecks: () => Promise<unknown[]>
  getDeck: (id: string) => Promise<unknown | null>
  saveDeck: (deck: unknown) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  getTaxonomy: () => Promise<unknown>
  saveTaxonomy: (taxonomy: unknown) => Promise<void>
  listCardLists: () => Promise<unknown[]>
  getCardList: (id: string) => Promise<unknown | null>
  saveCardList: (list: unknown) => Promise<void>
  deleteCardList: (id: string) => Promise<boolean>
  getConfig: () => Promise<unknown>
  saveConfig: (config: unknown) => Promise<void>
  getGlobalRoles: () => Promise<unknown[]>
  saveGlobalRoles: (roles: unknown[]) => Promise<void>
  getSetCollection: () => Promise<unknown>
  saveSetCollection: (collection: unknown) => Promise<void>
  getPullListConfig: () => Promise<unknown>
  savePullListConfig: (config: unknown) => Promise<void>
  onStorageChanged: (callback: (data: { event: string; filename: string }) => void) => void
  removeStorageListener: () => void
  getMcpClientStatus: (clientId: string) => Promise<McpConnectionStatus>
  connectMcpClient: (clientId: string) => Promise<{ success: boolean; error?: string }>
  disconnectMcpClient: (clientId: string) => Promise<{ success: boolean; error?: string }>
  getCacheStats: () => Promise<CacheStats>
  clearJsonCache: () => Promise<void>
  clearImageCache: () => Promise<void>
  clearAllCache: () => Promise<void>
  rebuildCacheIndex: () => Promise<CacheIndex>
  preCacheDeck: (deckId: string, includeImages: boolean) => Promise<PreCacheResult>
  getCachedImagePath: (scryfallId: string, face?: string) => Promise<string | null>
  loadAllCardsToCache: (includeImages: boolean) => Promise<void>
  onCacheProgress: (callback: (progress: CacheLoadProgress) => void) => () => void
  cancelCacheLoad: () => Promise<void>
  exportCollection: () => Promise<CollectionExportResult>
  importCollection: () => Promise<CollectionImportResult>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
