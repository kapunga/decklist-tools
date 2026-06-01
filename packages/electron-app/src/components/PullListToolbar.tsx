import { useState } from 'react'
import { Settings, RotateCcw, Eye, EyeOff, Mountain, ScanSearch } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/hooks/useStore'
import { captionTagStyle, captionLabelStyle, PAGE_X_PAD } from '@/lib/mastheadStyles'
import type { CSSProperties } from 'react'
import type { PullListSortKey, PullListSource } from '@/types'

interface PullListToolbarProps {
  deckId: string
  sortColumns: PullListSortKey[]
  showPulledSection: boolean
  hideBasicLands: boolean
  source: PullListSource
  identifyMode: boolean
  onToggleIdentifyMode: () => void
}

const SORT_OPTIONS: { key: PullListSortKey; label: string }[] = [
  { key: 'collectorNumber', label: 'Collector Number' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'type', label: 'Type' },
  { key: 'manaCost', label: 'Mana Cost' },
  { key: 'name', label: 'Name' },
]

// A caption-tag action button (Cache/Roles register). `active` lifts it to the
// foreground ink so toggled-on state reads without a filled chip.
function toolbarButtonStyle(active = false): CSSProperties {
  return {
    ...captionTagStyle,
    color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
  }
}

export function PullListToolbar({
  deckId,
  sortColumns,
  showPulledSection,
  hideBasicLands,
  source,
  identifyMode,
  onToggleIdentifyMode,
}: PullListToolbarProps) {
  const updatePullListConfig = useStore(state => state.updatePullListConfig)
  const resetPulledStatus = useStore(state => state.resetPulledStatus)
  const [sortOpen, setSortOpen] = useState(false)

  const handleSourceChange = async (value: PullListSource) => {
    await updatePullListConfig({ source: value })
  }

  const handleToggleSortColumn = async (key: PullListSortKey) => {
    const current = [...sortColumns]
    const index = current.indexOf(key)

    if (index >= 0) {
      // Remove if already in list (unless it's the last one)
      if (current.length > 1) {
        current.splice(index, 1)
      }
    } else {
      // Add to end
      current.push(key)
    }

    await updatePullListConfig({ sortColumns: current })
  }

  const handleTogglePulledSection = async () => {
    await updatePullListConfig({ showPulledSection: !showPulledSection })
  }

  const handleToggleBasicLands = async () => {
    await updatePullListConfig({ hideBasicLands: !hideBasicLands })
  }

  const handleReset = async () => {
    if (confirm('Reset all pulled status for this deck? This cannot be undone.')) {
      await resetPulledStatus(deckId)
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-6 flex-shrink-0 flex-wrap"
      style={{
        padding: `14px ${PAGE_X_PAD}`,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-7 flex-wrap">
        {/* Source toggle — caption labels rather than a segmented control */}
        <div className="flex items-center gap-2.5">
          <span style={captionLabelStyle}>Source</span>
          <button
            type="button"
            onClick={() => handleSourceChange('mainDeck')}
            className="hover:opacity-80 transition-opacity"
            style={toolbarButtonStyle(source === 'mainDeck')}
          >
            Deck
          </button>
          <span style={{ ...captionTagStyle, color: 'var(--muted-foreground)', cursor: 'default' }}>·</span>
          <button
            type="button"
            onClick={() => handleSourceChange('maybeboard')}
            className="hover:opacity-80 transition-opacity"
            style={toolbarButtonStyle(source === 'maybeboard')}
          >
            Maybeboard
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleIdentifyMode}
          className="hover:opacity-80 transition-opacity"
          style={toolbarButtonStyle(identifyMode)}
        >
          <ScanSearch className="w-3.5 h-3.5" />
          {identifyMode ? 'Exit Identify' : 'Identify Prints'}
        </button>

        {!identifyMode && (
          <>
            <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hover:opacity-80 transition-opacity"
                  style={toolbarButtonStyle(sortOpen)}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Sort Options
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort by (in order)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORT_OPTIONS.map(option => {
                  const index = sortColumns.indexOf(option.key)
                  const isActive = index >= 0
                  return (
                    <DropdownMenuCheckboxItem
                      key={option.key}
                      checked={isActive}
                      onCheckedChange={() => handleToggleSortColumn(option.key)}
                    >
                      {isActive && <span className="text-xs text-muted-foreground mr-1">({index + 1})</span>}
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={handleTogglePulledSection}
              className="hover:opacity-80 transition-opacity"
              style={toolbarButtonStyle(showPulledSection)}
            >
              {showPulledSection ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPulledSection ? 'Hide Pulled' : 'Show Pulled'}
            </button>

            <button
              type="button"
              onClick={handleToggleBasicLands}
              className="hover:opacity-80 transition-opacity"
              style={toolbarButtonStyle(!hideBasicLands)}
            >
              <Mountain className="w-3.5 h-3.5" />
              {hideBasicLands ? 'Show Basics' : 'Hide Basics'}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="hover:opacity-80 transition-opacity"
        style={{ ...captionTagStyle, color: 'var(--destructive)' }}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset All
      </button>
    </div>
  )
}
