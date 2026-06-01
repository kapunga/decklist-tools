import { useState, useEffect } from 'react'
import { Loader2, Package, Check } from 'lucide-react'
import { PullListToolbar } from '@/components/PullListToolbar'
import { PullListTable } from '@/components/PullListTable'
import { IdentifyModeList } from '@/components/IdentifyModeList'
import { CardImage } from '@/components/CardImage'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { usePullList, type PullListGroup, type PullListItem } from '@/hooks/usePullList'
import { getCardById } from '@/lib/scryfall'
import {
  captionLabelStyle,
  editorialTextStyle,
  sectionTitleStyle,
  PAGE_X_PAD,
} from '@/lib/mastheadStyles'
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
  const totalCards = group.items.reduce((sum, item) => sum + item.remainingNeeded, 0)
  const uniqueCards = new Set(group.items.map(i => i.deckCardId)).size

  return (
    <CollapsibleSection
      defaultOpen={defaultOpen}
      title={
        <div className="flex items-baseline gap-3">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--foreground)',
              letterSpacing: '-0.01em',
            }}
          >
            {group.setName}
          </span>
          <span style={captionLabelStyle}>{group.setCode.toUpperCase()}</span>
        </div>
      }
      badge={`${uniqueCards} unique · ${totalCards} cards`}
    >
      <PullListTable
        items={group.items}
        deckId={deckId}
        focusedItemKey={focusedItemKey}
        onFocusItem={onFocusItem}
      />
    </CollapsibleSection>
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
    sortColumns,
    source,
    identifyItems,
    printingsMap,
  } = usePullList(deck)

  const [identifyMode, setIdentifyMode] = useState(false)

  // Focus state for card preview
  const [focusedItem, setFocusedItem] = useState<PullListItem | null>(null)
  const [focusedScryfallId, setFocusedScryfallId] = useState<string | null>(null)
  const [focusedScryfallCard, setFocusedScryfallCard] = useState<ScryfallCard | null>(null)
  const [loadingCard, setLoadingCard] = useState(false)

  useEffect(() => {
    if (!focusedScryfallId) {
      setFocusedScryfallCard(null)
      return
    }

    if (focusedScryfallCard?.id === focusedScryfallId) {
      return
    }

    let cancelled = false

    const fetchCard = async () => {
      setLoadingCard(true)
      try {
        const scryfallCard = await getCardById(focusedScryfallId)
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
  }, [focusedScryfallId])

  const handleFocusItem = (item: PullListItem) => {
    setFocusedItem(item)
    setFocusedScryfallId(item.scryfallId)
  }

  const handleHoverPrintingById = (scryfallId: string) => {
    if (focusedScryfallCard?.id === scryfallId) return
    setFocusedScryfallId(scryfallId)
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
        source={source}
        identifyMode={identifyMode}
        onToggleIdentifyMode={() => setIdentifyMode(prev => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Focused card with editorial framing */}
        <div
          className="w-72 shrink-0 flex flex-col gap-4 p-6 overflow-auto"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <span style={captionLabelStyle}>Currently viewing</span>

          {loadingCard ? (
            <div className="flex items-center justify-center" style={{ height: '380px' }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            </div>
          ) : focusedScryfallCard ? (
            <div className="flex flex-col gap-4">
              <CardImage card={focusedScryfallCard} size="large" />
              <div className="flex flex-col gap-1">
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: 'var(--foreground)',
                    letterSpacing: '-0.015em',
                    lineHeight: '26px',
                  }}
                >
                  {focusedScryfallCard.name}
                </span>
                {focusedItem && (
                  <span style={captionLabelStyle}>
                    {focusedItem.setCode.toUpperCase()} #{focusedItem.collectorNumber}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                height: '380px',
                fontFamily: 'var(--font-tagline)',
                fontStyle: 'italic',
                fontSize: '14px',
                color: 'var(--muted-foreground)',
              }}
            >
              click a card to preview
            </div>
          )}
        </div>

        {/* Right column - Pull list */}
        <div
          className="flex-1 overflow-auto py-6 space-y-8"
          style={{ paddingLeft: PAGE_X_PAD, paddingRight: PAGE_X_PAD }}
        >
        {identifyMode ? (
          <IdentifyModeList
            items={identifyItems}
            printingsMap={printingsMap}
            deckId={deck.id}
            onHoverPrinting={handleHoverPrintingById}
          />
        ) : (
          <>
            {/* Unpulled Section */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                  <h2 style={sectionTitleStyle}>Cards to Pull</h2>
                </div>
                {!allPulled && (
                  <span style={editorialTextStyle}>
                    {uniqueUnpulledCards} unique cards remaining
                  </span>
                )}
              </div>

              {allPulled ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                  <Check className="h-12 w-12 mb-2" style={{ color: 'var(--ring)' }} />
                  <p style={sectionTitleStyle}>All cards pulled!</p>
                  <p
                    style={{
                      fontFamily: 'var(--font-tagline)',
                      fontStyle: 'italic',
                      fontSize: '14px',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    {source === 'maybeboard'
                      ? 'all maybeboard cards have been pulled'
                      : 'your deck is ready to play'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
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
              <div
                className="space-y-4 pt-6"
                style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}
              >
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                  <h2 style={{ ...sectionTitleStyle, color: 'var(--muted-foreground)' }}>Already Pulled</h2>
                </div>

                <div className="space-y-4 opacity-75">
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
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Package className="h-12 w-12 mb-2" style={{ color: 'var(--muted-foreground)' }} />
                <p style={sectionTitleStyle}>
                  {source === 'maybeboard'
                    ? 'No maybeboard cards in owned sets'
                    : 'No cards in owned sets'}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-tagline)',
                    fontStyle: 'italic',
                    fontSize: '14px',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {source === 'maybeboard'
                    ? 'add confirmed cards to the maybeboard, or add sets to your collection'
                    : 'add sets to your collection in Settings to see pull list options'}
                </p>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}
