/// <reference types="vite/client" />

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

export type DeckExportFormatId = 'arena' | 'moxfield' | 'archidekt' | 'mtgo' | 'simple'
export type DeckExportSection = 'mainboard' | 'sideboard' | 'maybeboard'

export interface DeckExportArgs {
  deckId: string
  format: DeckExportFormatId
  includeSideboard?: boolean
  includeMaybeboard?: boolean
  section?: DeckExportSection
}

export interface DeckExportResult {
  success: boolean
  cancelled?: boolean
  filePath?: string
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
  getMcpClientStatus: (clientId: string) => Promise<{ connected: boolean; configPath: string; mcpServerPath?: string }>
  connectMcpClient: (clientId: string) => Promise<{ success: boolean; error?: string }>
  disconnectMcpClient: (clientId: string) => Promise<{ success: boolean; error?: string }>
  getCacheStats: () => Promise<CacheStats>
  clearJsonCache: () => Promise<void>
  clearImageCache: () => Promise<void>
  clearAllCache: () => Promise<void>
  rebuildCacheIndex: () => Promise<CacheIndex>
  preCacheDeck: (deckId: string, includeImages: boolean) => Promise<PreCacheResult>
  getCachedImagePath: (scryfallId: string, face?: string) => Promise<string | null>
  getOrFetchArtCrop: (scryfallId: string, face?: 'front' | 'back') => Promise<string | null>
  getCachedCards: (scryfallIds: string[]) => Promise<Record<string, unknown>>
  loadAllCardsToCache: (includeImages: boolean) => Promise<void>
  onCacheProgress: (callback: (progress: CacheLoadProgress) => void) => () => void
  cancelCacheLoad: () => Promise<void>
  exportCollection: () => Promise<CollectionExportResult>
  importCollection: () => Promise<CollectionImportResult>
  exportDeck: (args: DeckExportArgs) => Promise<DeckExportResult>
  onMenuAction: (callback: (action: string, payload?: unknown) => void) => () => void
  setExportMenuEnabled: (enabled: boolean) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
