import { useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { useApplyTheme } from '@/hooks/useApplyTheme'
import { useStorageSync } from '@/hooks/useStorageSync'
import { AppShell } from '@/components/AppShell'
import { DeckList } from '@/components/DeckList'
import { DeckDetail } from '@/components/DeckDetail'
import { InterestListView } from '@/components/InterestListView'
import { BuyListView } from '@/components/BuyListView'

export function App() {
  const loadData = useStore(state => state.loadData)
  const isLoading = useStore(state => state.isLoading)
  const hasInitialized = useStore(state => state.hasInitialized)
  const error = useStore(state => state.error)
  const currentView = useStore(state => state.currentView)
  const setView = useStore(state => state.setView)
  const theme = useStore(state => state.config?.theme)
  const updateConfig = useStore(state => state.updateConfig)
  const triggerNewDeck = useStore(state => state.triggerNewDeck)
  const triggerImportDeck = useStore(state => state.triggerImportDeck)
  const triggerExportDeck = useStore(state => state.triggerExportDeck)
  const triggerFocusSearch = useStore(state => state.triggerFocusSearch)

  useStorageSync(loadData)
  useApplyTheme(theme)

  // Wire native-menu actions to store triggers. Components owning each side
  // effect (DeckList, DeckDetail) react via their respective token counters.
  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuAction((action, payload) => {
      switch (action) {
        case 'new-deck':
          setView('decks')
          triggerNewDeck()
          break
        case 'import-deck':
          setView('decks')
          triggerImportDeck()
          break
        case 'export-deck':
          triggerExportDeck()
          break
        case 'focus-search':
          setView('decks')
          triggerFocusSearch()
          break
        case 'set-theme':
          if (typeof payload === 'string') {
            updateConfig({ theme: payload as typeof theme })
          }
          break
      }
    })
    return unsubscribe
  }, [setView, triggerNewDeck, triggerImportDeck, triggerExportDeck, triggerFocusSearch, updateConfig])

  // Only show global loading spinner on initial app load, not during operations
  if (isLoading && !hasInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading decks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold mb-2">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <div className="titlebar h-8 shrink-0" />
      <AppShell>
        <div className="h-full overflow-hidden">
          {currentView === 'decks' && <DeckList />}
          {currentView === 'deck-detail' && <DeckDetail />}
          {currentView === 'interest-list' && <InterestListView />}
          {currentView === 'buy-list' && <BuyListView />}
        </div>
      </AppShell>
    </div>
  )
}
