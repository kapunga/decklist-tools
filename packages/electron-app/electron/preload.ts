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
  disconnectClaudeDesktop: () => ipcRenderer.invoke('claude:disconnect')
})

// Type definitions for the exposed API
export interface ClaudeConnectionStatus {
  connected: boolean
  configPath: string
  mcpServerPath?: string
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
