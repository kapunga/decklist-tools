import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { SettingsWindow } from './SettingsWindow'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TooltipProvider } from './components/ui/tooltip'
import './styles/fonts'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
    },
  },
})

const isSettingsWindow = new URLSearchParams(window.location.search).get('view') === 'settings'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {/* One provider for every tooltip in the app, rather than one per role pill. */}
        <TooltipProvider delayDuration={300}>
          {isSettingsWindow ? <SettingsWindow /> : <App />}
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
)
