import { useStore } from '@/hooks/useStore'
import { useApplyTheme } from '@/hooks/useApplyTheme'
import { useStorageSync } from '@/hooks/useStorageSync'
import { SettingsPage } from '@/components/SettingsPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function SettingsWindow() {
  const loadData = useStore(state => state.loadData)
  const isLoading = useStore(state => state.isLoading)
  const hasInitialized = useStore(state => state.hasInitialized)
  const error = useStore(state => state.error)
  const theme = useStore(state => state.config?.theme)

  useStorageSync(loadData)
  useApplyTheme(theme)

  if (isLoading && !hasInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold mb-2">Error loading settings</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground">
      <ErrorBoundary>
        <SettingsPage />
      </ErrorBoundary>
    </div>
  )
}
