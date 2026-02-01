import { useEffect } from 'react'
import { Library, Star, ShoppingCart, Settings } from 'lucide-react'
import { useStore, type AppView } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { DeckList } from '@/components/DeckList'
import { DeckDetail } from '@/components/DeckDetail'
import { InterestListView } from '@/components/InterestListView'
import { BuyListView } from '@/components/BuyListView'
import { SettingsPage } from '@/components/SettingsPage'

export function App() {
  const loadData = useStore(state => state.loadData)
  const isLoading = useStore(state => state.isLoading)
  const hasInitialized = useStore(state => state.hasInitialized)
  const error = useStore(state => state.error)
  const currentView = useStore(state => state.currentView)
  const setView = useStore(state => state.setView)

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
    <div className="h-screen bg-background text-foreground flex flex-col pt-12">
      {/* Top Navigation Bar */}
      <header className="h-10 border-b flex items-center justify-between px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
