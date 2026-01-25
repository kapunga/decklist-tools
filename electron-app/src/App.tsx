import { useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { DeckList } from '@/components/DeckList'
import { DeckDetail } from '@/components/DeckDetail'

export function App() {
  const loadData = useStore(state => state.loadData)
  const isLoading = useStore(state => state.isLoading)
  const error = useStore(state => state.error)
  const selectedDeckId = useStore(state => state.selectedDeckId)

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

  if (isLoading) {
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
    <div className="h-screen bg-background text-foreground flex pt-10">
      {/* Sidebar - Deck List */}
      <div
        className={`border-r transition-all duration-200 ${
          selectedDeckId ? 'w-0 overflow-hidden' : 'w-full'
        }`}
      >
        <DeckList />
      </div>

      {/* Main content - Deck Detail */}
      <div
        className={`transition-all duration-200 ${
          selectedDeckId ? 'w-full' : 'w-0 overflow-hidden'
        }`}
      >
        <DeckDetail />
      </div>
    </div>
  )
}
