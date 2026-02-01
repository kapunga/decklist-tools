/// <reference types="vite/client" />

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
  onStorageChanged: (callback: (data: { event: string; filename: string }) => void) => void
  removeStorageListener: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
