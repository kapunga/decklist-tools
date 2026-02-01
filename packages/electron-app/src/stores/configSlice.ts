import type { ConfigSlice, SliceCreator } from './types'

export const createConfigSlice: SliceCreator<ConfigSlice> = (set, get) => ({
  updateConfig: async (updates) => {
    const state = get()
    if (!state.config) return

    const updatedConfig = { ...state.config, ...updates }
    await window.electronAPI.saveConfig(updatedConfig)
    set({ config: updatedConfig })
  },
})
