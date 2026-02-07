import { Settings, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/hooks/useStore'
import type { PullListSortKey } from '@/types'

interface PullListToolbarProps {
  deckId: string
  sortColumns: PullListSortKey[]
  showPulledSection: boolean
}

const SORT_OPTIONS: { key: PullListSortKey; label: string }[] = [
  { key: 'collectorNumber', label: 'Collector Number' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'type', label: 'Type' },
  { key: 'manaCost', label: 'Mana Cost' },
  { key: 'name', label: 'Name' },
]

export function PullListToolbar({
  deckId,
  sortColumns,
  showPulledSection
}: PullListToolbarProps) {
  const updatePullListConfig = useStore(state => state.updatePullListConfig)
  const resetPulledStatus = useStore(state => state.resetPulledStatus)

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

  const handleReset = async () => {
    if (confirm('Reset all pulled status for this deck? This cannot be undone.')) {
      await resetPulledStatus(deckId)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Sort Options
            </Button>
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

        <Button
          variant="outline"
          size="sm"
          onClick={handleTogglePulledSection}
        >
          {showPulledSection ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Pulled
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Pulled
            </>
          )}
        </Button>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={handleReset}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset All
      </Button>
    </div>
  )
}
