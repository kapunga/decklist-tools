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

  // Interest List
  getInterestList: () => ipcRenderer.invoke('interest:get'),
  saveInterestList: (list: unknown) => ipcRenderer.invoke('interest:save', list),

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

  // Claude Desktop integration
  getClaudeConnectionStatus: () => ipcRenderer.invoke('claude:status'),
  connectClaudeDesktop: () => ipcRenderer.invoke('claude:connect'),
  disconnectClaudeDesktop: () => ipcRenderer.invoke('claude:disconnect'),

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
  cancelCacheLoad: () => ipcRenderer.invoke('cache:load-cancel')
})

// Type definitions for the exposed API
export interface ClaudeConnectionStatus {
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

export interface ElectronAPI {
  listDecks: () => Promise<unknown[]>
  getDeck: (id: string) => Promise<unknown | null>
  saveDeck: (deck: unknown) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  getTaxonomy: () => Promise<unknown>
  saveTaxonomy: (taxonomy: unknown) => Promise<void>
  getInterestList: () => Promise<unknown>
  saveInterestList: (list: unknown) => Promise<void>
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
  getClaudeConnectionStatus: () => Promise<ClaudeConnectionStatus>
  connectClaudeDesktop: () => Promise<{ success: boolean; error?: string }>
  disconnectClaudeDesktop: () => Promise<{ success: boolean; error?: string }>
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
