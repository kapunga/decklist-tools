import { useEffect } from 'react'
import { Library, Star, ShoppingCart, Settings } from 'lucide-react'
import { useStore, type AppView } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { DeckList } from '@/components/DeckList'
import { DeckDetail } from '@/components/DeckDetail'
import { InterestListView } from '@/components/InterestListView'
import { BuyListView } from '@/components/BuyListView'
import { SettingsPage } from '@/components/SettingsPage'
import { ALL_THEMES } from '@/types'

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

  useEffect(() => {
    loadData()

    // Listen for storage changes from MCP server
    window.electronAPI.onStorageChanged(() => {
      loadData()
    })

    return () => {
      window.electronAPI.removeStorageListener()
    }
  }, [loadData])

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

  // Sync theme class on <html>. Strips any prior theme-* class so switching works cleanly.
  useEffect(() => {
    if (!theme) return
    const root = document.documentElement
    for (const t of ALL_THEMES) root.classList.remove(`theme-${t}`)
    root.classList.add(`theme-${theme}`)
  }, [theme])

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
      {/* Titlebar drag region - spans full width, behind traffic lights */}
      <div className="titlebar h-12 shrink-0 flex items-end">
        {/* Navigation sits inside titlebar but buttons are no-drag via CSS */}
        <header className="h-10 w-full border-b flex items-center justify-between pl-20 pr-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex items-center gap-1">
          <NavButton
            view="decks"
            currentView={currentView}
            onClick={() => setView('decks')}
            icon={<Library className="w-4 h-4" />}
            label="My Decks"
          />
          <NavButton
            view="interest-list"
            currentView={currentView}
            onClick={() => setView('interest-list')}
            icon={<Star className="w-4 h-4" />}
            label="Interest List"
          />
          <NavButton
            view="buy-list"
            currentView={currentView}
            onClick={() => setView('buy-list')}
            icon={<ShoppingCart className="w-4 h-4" />}
            label="Buy List"
          />
        </nav>
        <Button
          variant={currentView === 'settings' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('settings')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        </header>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'decks' && <DeckList />}
        {currentView === 'deck-detail' && <DeckDetail />}
        {currentView === 'interest-list' && <InterestListView />}
        {currentView === 'buy-list' && <BuyListView />}
        {currentView === 'settings' && <SettingsPage />}
      </div>
    </div>
  )
}

interface NavButtonProps {
  view: AppView
  currentView: AppView
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function NavButton({ view, currentView, onClick, icon, label }: NavButtonProps) {
  // deck-detail should highlight "decks" nav
  const isActive = view === currentView || (view === 'decks' && currentView === 'deck-detail')

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      {icon}
      {label}
    </Button>
  )
}
