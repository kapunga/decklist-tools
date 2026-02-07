import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Package, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PullListToolbar } from '@/components/PullListToolbar'
import { PullListTable } from '@/components/PullListTable'
import { usePullList, type PullListGroup } from '@/hooks/usePullList'
import type { Deck } from '@/types'

interface PullListViewProps {
  deck: Deck
}

interface CollapsibleSetSectionProps {
  group: PullListGroup
  deckId: string
  defaultOpen?: boolean
}

function CollapsibleSetSection({ group, deckId, defaultOpen = true }: CollapsibleSetSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const totalCards = group.items.reduce((sum, item) => sum + item.remainingNeeded, 0)
  const uniqueCards = new Set(group.items.map(i => i.deckCardId)).size

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">{group.setName}</span>
          <Badge variant="outline" className="text-xs">
            {group.setCode.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{uniqueCards} unique</span>
          <span>|</span>
          <span>{totalCards} cards</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t">
          <PullListTable items={group.items} deckId={deckId} />
        </div>
      )}
    </div>
  )
}

export function PullListView({ deck }: PullListViewProps) {
  const {
    unpulledGroups,
    pulledGroups,
    uniqueUnpulledCards,
    isLoading,
    showPulledSection,
    sortColumns
  } = usePullList(deck)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const allPulled = unpulledGroups.length === 0

  return (
    <div className="h-full flex flex-col">
      <PullListToolbar
        deckId={deck.id}
        sortColumns={sortColumns}
        showPulledSection={showPulledSection}
      />

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Unpulled Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Cards to Pull</h2>
            </div>
            {!allPulled && (
              <Badge variant="secondary">
                {uniqueUnpulledCards} unique cards remaining
              </Badge>
            )}
          </div>

          {allPulled ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-500">All cards pulled!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your deck is ready to play
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpulledGroups.map(group => (
                <CollapsibleSetSection
                  key={group.setCode}
                  group={group}
                  deckId={deck.id}
                  defaultOpen={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pulled Section */}
        {showPulledSection && pulledGroups.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-muted-foreground">Already Pulled</h2>
            </div>

            <div className="space-y-3 opacity-75">
              {pulledGroups.map(group => (
                <CollapsibleSetSection
                  key={group.setCode}
                  group={group}
                  deckId={deck.id}
                  defaultOpen={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no set collection */}
        {unpulledGroups.length === 0 && pulledGroups.length === 0 && !allPulled && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No cards in owned sets</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add sets to your collection in Settings to see pull list options
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
