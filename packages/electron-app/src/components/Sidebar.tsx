import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ListChecks, Coins, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
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

interface NavChild {
  id: string
  label: string
}

interface NavSection {
  /** The view to navigate to when the row is clicked. */
  indexView: AppView
  /** Sibling detail view that should also count as "in" this section. */
  detailView?: AppView
  label: string
  icon: ReactNode
  /** Children to render when expanded. Empty array = expandable section with no items yet. Undefined = leaf row, no chevron. */
  children?: NavChild[]
  /** Currently selected child id (highlights and is the auto-target when entering detail). */
  selectedChildId?: string | null
  /** Called when a child is clicked. */
  onSelectChild?: (id: string) => void
}

function isSectionActive(section: NavSection, current: AppView): boolean {
  return current === section.indexView || current === section.detailView
}

export function Sidebar() {
  const currentView = useStore(state => state.currentView)
  const setView = useStore(state => state.setView)
  const isCollapsed = useStore(state => state.isSidebarCollapsed)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const theme = useStore(state => state.config?.theme) as ThemeId | undefined
  const themeName = theme ? THEMES[theme].name : ''

  const decks = useStore(state => state.decks)
  const cardLists = useStore(state => state.cardLists)
  const selectedDeckId = useStore(state => state.selectedDeckId)
  const selectedCardListId = useStore(state => state.selectedCardListId)
  const selectDeck = useStore(state => state.selectDeck)
  const selectCardList = useStore(state => state.selectCardList)

  const deckChildren = useMemo<NavChild[]>(
    () => [...decks].sort((a, b) => a.name.localeCompare(b.name)).map(d => ({ id: d.id, label: d.name })),
    [decks],
  )
  const listChildren = useMemo<NavChild[]>(
    () => [...cardLists].sort((a, b) => a.name.localeCompare(b.name)).map(l => ({ id: l.id, label: l.name })),
    [cardLists],
  )

  const sections: NavSection[] = [
    {
      indexView: 'decks',
      detailView: 'deck-detail',
      label: 'Decks',
      icon: <DeckStackIcon className="w-4 h-4 shrink-0" />,
      children: deckChildren,
      selectedChildId: selectedDeckId,
      onSelectChild: selectDeck,
    },
    {
      indexView: 'lists',
      detailView: 'list-detail',
      label: 'Lists',
      icon: <ListChecks className="w-4 h-4 shrink-0" />,
      children: listChildren,
      selectedChildId: selectedCardListId,
      onSelectChild: selectCardList,
    },
    {
      indexView: 'buy-list',
      label: 'Buy List',
      icon: <Coins className="w-4 h-4 shrink-0" />,
    },
  ]

  // Track expansion per indexView. Auto-open a section when its detail view becomes active.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  useEffect(() => {
    for (const s of sections) {
      if (s.detailView && currentView === s.detailView) {
        setExpanded(prev => (prev[s.indexView] ? prev : { ...prev, [s.indexView]: true }))
      }
    }
    // sections is rebuilt every render, but we only care about currentView here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView])

  const toggleExpanded = (key: AppView) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside
      className="flex flex-col shrink-0 transition-[width] duration-150"
      style={{
        width: isCollapsed ? '64px' : 'clamp(200px, 18vw, 280px)',
        backgroundColor: 'var(--background)',
      }}
    >
      <BrandRow isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 px-2 pt-3">
        {sections.map(section => (
          <SectionGroup
            key={section.indexView}
            section={section}
            isCollapsed={isCollapsed}
            isActive={isSectionActive(section, currentView)}
            isExpanded={!!expanded[section.indexView]}
            onToggle={() => toggleExpanded(section.indexView)}
            onNavigate={() => setView(section.indexView)}
            currentView={currentView}
          />
        ))}
      </nav>
      <BottomDock
        isCollapsed={isCollapsed}
        onSettingsClick={() => window.electronAPI.openSettings()}
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

interface SectionGroupProps {
  section: NavSection
  isCollapsed: boolean
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  onNavigate: () => void
  currentView: AppView
}

function SectionGroup({
  section, isCollapsed, isActive, isExpanded, onToggle, onNavigate, currentView,
}: SectionGroupProps) {
  const expandable = !isCollapsed && Array.isArray(section.children)
  const showChildren = expandable && isExpanded && section.children!.length > 0
  const sectionRowActive = isActive && (
    // Highlight the section header itself only when on the index view, not when on a detail.
    // When on a detail, the child row carries the active highlight instead.
    currentView === section.indexView
  )

  return (
    <div className="flex flex-col">
      <SectionHeaderRow
        label={section.label}
        icon={section.icon}
        isActive={sectionRowActive}
        isCollapsed={isCollapsed}
        isExpandable={!!expandable}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onNavigate={onNavigate}
      />
      {showChildren && (
        <div className="flex flex-col gap-0.5 mt-0.5 mb-1">
          {section.children!.map(child => (
            <ChildNavRow
              key={child.id}
              label={child.label}
              isActive={section.selectedChildId === child.id && currentView === section.detailView}
              onClick={() => section.onSelectChild?.(child.id)}
            />
          ))}
          {section.children!.length === 0 && (
            <div
              className="pl-9 pr-2 py-1 text-xs italic"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SectionHeaderRowProps {
  label: string
  icon: ReactNode
  isActive: boolean
  isCollapsed: boolean
  isExpandable: boolean
  isExpanded: boolean
  onToggle: () => void
  onNavigate: () => void
}

function SectionHeaderRow({
  label, icon, isActive, isCollapsed, isExpandable, isExpanded, onToggle, onNavigate,
}: SectionHeaderRowProps) {
  return (
    <div
      className="sidebar-nav-row relative h-9 flex items-center text-left"
      data-active={isActive ? 'true' : undefined}
      style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
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
      {isExpandable ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          className="w-5 h-9 shrink-0 flex items-center justify-center hover:text-foreground"
        >
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
          />
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <button
        type="button"
        onClick={onNavigate}
        title={isCollapsed ? label : undefined}
        className="flex-1 h-9 px-1 flex items-center gap-3 text-left"
      >
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
    </div>
  )
}

interface ChildNavRowProps {
  label: string
  isActive: boolean
  onClick: () => void
}

function ChildNavRow({ label, isActive, onClick }: ChildNavRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sidebar-nav-row relative h-8 pl-9 pr-2 flex items-center text-left"
      data-active={isActive ? 'true' : undefined}
      style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
    >
      {isActive && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '-8px',
            top: '6px',
            width: '2px',
            height: '20px',
            backgroundColor: 'var(--masthead-rule-color)',
          }}
        />
      )}
      <span
        className="sidebar-nav-label truncate"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12.5px',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </span>
    </button>
  )
}

interface BottomDockProps {
  isCollapsed: boolean
  onSettingsClick: () => void
  themeName: string
}

function BottomDock({ isCollapsed, onSettingsClick, themeName }: BottomDockProps) {
  return (
    <div className="shrink-0 px-2 pb-4 pt-2 flex flex-col gap-2">
      <SettingsRow isCollapsed={isCollapsed} onClick={onSettingsClick} />
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

function SettingsRow({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isCollapsed ? 'Settings' : undefined}
      className="sidebar-nav-row relative h-9 px-2 flex items-center gap-3 text-left"
      style={{ color: 'var(--muted-foreground)' }}
    >
      <Settings className="w-4 h-4 shrink-0" />
      {!isCollapsed && (
        <span
          className="sidebar-nav-label truncate"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            letterSpacing: '-0.005em',
          }}
        >
          Settings
        </span>
      )}
    </button>
  )
}
