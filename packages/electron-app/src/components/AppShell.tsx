import type { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
