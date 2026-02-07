import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2, Package, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PullListToolbar } from '@/components/PullListToolbar'
import { PullListTable } from '@/components/PullListTable'
import { CardImage } from '@/components/CardImage'
import { usePullList, type PullListGroup, type PullListItem } from '@/hooks/usePullList'
import { getCardById } from '@/lib/scryfall'
import type { Deck, ScryfallCard } from '@/types'

interface PullListViewProps {
  deck: Deck
}

interface CollapsibleSetSectionProps {
  group: PullListGroup
  deckId: string
  defaultOpen?: boolean
  focusedItemKey: string | null
  onFocusItem: (item: PullListItem) => void
}

function CollapsibleSetSection({ group, deckId, defaultOpen = true, focusedItemKey, onFocusItem }: CollapsibleSetSectionProps) {
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
          <PullListTable
            items={group.items}
            deckId={deckId}
            focusedItemKey={focusedItemKey}
            onFocusItem={onFocusItem}
          />
        </div>
      )}
    </div>
  )
}

// Helper to create a unique key for a pull list item
function getItemKey(item: PullListItem): string {
  return `${item.deckCardId}-${item.setCode}-${item.collectorNumber}`
}

export function PullListView({ deck }: PullListViewProps) {
  const {
    unpulledGroups,
    pulledGroups,
    uniqueUnpulledCards,
    isLoading,
    showPulledSection,
    hideBasicLands,
    sortColumns
  } = usePullList(deck)

  // Focus state for card preview
  const [focusedItem, setFocusedItem] = useState<PullListItem | null>(null)
  const [focusedScryfallCard, setFocusedScryfallCard] = useState<ScryfallCard | null>(null)
  const [loadingCard, setLoadingCard] = useState(false)

  // Fetch the focused card when it changes
  useEffect(() => {
    if (!focusedItem?.scryfallId) {
      setFocusedScryfallCard(null)
      return
    }

    // Don't refetch if we already have this card
    if (focusedScryfallCard?.id === focusedItem.scryfallId) {
      return
    }

    let cancelled = false

    const fetchCard = async () => {
      setLoadingCard(true)
      try {
        const scryfallCard = await getCardById(focusedItem.scryfallId)
        if (!cancelled) {
          setFocusedScryfallCard(scryfallCard)
        }
      } finally {
        if (!cancelled) {
          setLoadingCard(false)
        }
      }
    }

    fetchCard()

    return () => {
      cancelled = true
    }
  }, [focusedItem?.scryfallId])

  const handleFocusItem = (item: PullListItem) => {
    setFocusedItem(item)
  }

  const focusedItemKey = focusedItem ? getItemKey(focusedItem) : null

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
        hideBasicLands={hideBasicLands}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Focused card image */}
        <div className="w-72 shrink-0 border-r p-4 flex flex-col items-center overflow-auto">
          {loadingCard && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loadingCard && focusedScryfallCard && (
            <div className="space-y-2">
              <CardImage card={focusedScryfallCard} size="large" />
              <div className="text-center text-sm text-muted-foreground">
                {focusedItem?.setCode.toUpperCase()} #{focusedItem?.collectorNumber}
              </div>
            </div>
          )}
          {!loadingCard && !focusedScryfallCard && (
            <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
              Click a card to preview
            </div>
          )}
        </div>

        {/* Right column - Pull list */}
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
                  focusedItemKey={focusedItemKey}
                  onFocusItem={handleFocusItem}
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
                  focusedItemKey={focusedItemKey}
                  onFocusItem={handleFocusItem}
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
    </div>
  )
}
