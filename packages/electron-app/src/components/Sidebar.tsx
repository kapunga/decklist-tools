import type { ReactNode } from 'react'
import { Bookmark, Coins, Settings, ChevronLeft } from 'lucide-react'
import { useStore, type AppView } from '@/hooks/useStore'
import { THEMES } from '@/lib/themes'
import type { ThemeId } from '@/types'

function DeckStackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="13" height="15" rx="2" />
      <rect x="8" y="2" width="13" height="15" rx="2" />
    </svg>
  )
}

const NAV_ITEMS: { view: AppView; label: string; icon: ReactNode }[] = [
  { view: 'decks', label: 'Decks', icon: <DeckStackIcon className="w-4 h-4 shrink-0" /> },
  { view: 'interest-list', label: 'Interest List', icon: <Bookmark className="w-4 h-4 shrink-0" /> },
  { view: 'buy-list', label: 'Buy List', icon: <Coins className="w-4 h-4 shrink-0" /> },
]

function isViewActive(item: AppView, current: AppView): boolean {
  if (item === current) return true
  return item === 'decks' && current === 'deck-detail'
}

export function Sidebar() {
  const currentView = useStore(state => state.currentView)
  const setView = useStore(state => state.setView)
  const isCollapsed = useStore(state => state.isSidebarCollapsed)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const theme = useStore(state => state.config?.theme) as ThemeId | undefined
  const themeName = theme ? THEMES[theme].name : ''

  return (
    <aside
      className="flex flex-col shrink-0 transition-[width] duration-150"
      style={{
        width: isCollapsed ? '64px' : 'clamp(200px, 18vw, 280px)',
        backgroundColor: 'var(--background)',
      }}
    >
      <BrandRow isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <nav className="flex flex-col gap-0.5 px-2 pt-3">
        {NAV_ITEMS.map(item => (
          <NavRow
            key={item.view}
            label={item.label}
            icon={item.icon}
            isActive={isViewActive(item.view, currentView)}
            isCollapsed={isCollapsed}
            onClick={() => setView(item.view)}
          />
        ))}
      </nav>
      <div className="flex-1" />
      <BottomDock
        isCollapsed={isCollapsed}
        isSettingsActive={currentView === 'settings'}
        onSettingsClick={() => setView('settings')}
        themeName={themeName}
      />
    </aside>
  )
}

interface BrandRowProps {
  isCollapsed: boolean
  onToggle: () => void
}

function BrandRow({ isCollapsed, onToggle }: BrandRowProps) {
  return (
    <div className="h-14 shrink-0 px-4 flex items-center justify-between gap-2">
      {!isCollapsed && (
        <div
          className="leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'var(--foreground)',
            letterSpacing: '-0.01em',
          }}
        >
          Deckbuilder
        </div>
      )}
      <button
        onClick={onToggle}
        className="w-6 h-6 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}
        />
      </button>
    </div>
  )
}

interface NavRowProps {
  label: string
  icon: ReactNode
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
}

function NavRow({ label, icon, isActive, isCollapsed, onClick }: NavRowProps) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className="sidebar-nav-row relative h-9 px-2 flex items-center gap-3 text-left"
      data-active={isActive ? 'true' : undefined}
      style={{
        color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
      }}
    >
      {isActive && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '-8px',
            top: '8px',
            width: '2px',
            height: '20px',
            backgroundColor: 'var(--masthead-rule-color)',
          }}
        />
      )}
      {icon}
      {!isCollapsed && (
        <span
          className="sidebar-nav-label truncate"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            letterSpacing: '-0.005em',
          }}
        >
          {label}
        </span>
      )}
    </button>
  )
}

interface BottomDockProps {
  isCollapsed: boolean
  isSettingsActive: boolean
  onSettingsClick: () => void
  themeName: string
}

function BottomDock({ isCollapsed, isSettingsActive, onSettingsClick, themeName }: BottomDockProps) {
  return (
    <div className="px-2 pb-4 pt-2 flex flex-col gap-2">
      <NavRow
        label="Settings"
        icon={<Settings className="w-4 h-4 shrink-0" />}
        isActive={isSettingsActive}
        isCollapsed={isCollapsed}
        onClick={onSettingsClick}
      />
      {!isCollapsed && themeName && (
        <div className="px-2 pt-1 flex items-center gap-2">
          <span
            className="sidebar-theme-label"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: '13px',
              color: 'var(--muted-foreground)',
            }}
          >
            {themeName}
          </span>
        </div>
      )}
    </div>
  )
}
