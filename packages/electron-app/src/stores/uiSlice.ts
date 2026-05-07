import type { SliceCreator } from './types'

// UI slice — token counters used to trigger one-shot UI side-effects from
// outside the component that owns the side-effect. Each menu action increments
// its dedicated counter; consumers watch that counter in a useEffect and react
// when it changes. This keeps menu wiring out of component-local state without
// adding a real event-bus dependency.

export interface UISlice {
  newDeckToken: number
  importDeckToken: number
  exportDeckToken: number
  focusSearchToken: number
  triggerNewDeck: () => void
  triggerImportDeck: () => void
  triggerExportDeck: () => void
  triggerFocusSearch: () => void

  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const createUISlice: SliceCreator<UISlice> = (set) => ({
  newDeckToken: 0,
  importDeckToken: 0,
  exportDeckToken: 0,
  focusSearchToken: 0,
  triggerNewDeck: () => set(state => ({ newDeckToken: state.newDeckToken + 1 })),
  triggerImportDeck: () => set(state => ({ importDeckToken: state.importDeckToken + 1 })),
  triggerExportDeck: () => set(state => ({ exportDeckToken: state.exportDeckToken + 1 })),
  triggerFocusSearch: () => set(state => ({ focusSearchToken: state.focusSearchToken + 1 })),

  isSidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
})
