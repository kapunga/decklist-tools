import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trash2, Plus, Minus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CardImage } from '@/components/CardImage'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { BatchOperationsToolbar } from '@/components/BatchOperationsToolbar'
import { RolePill } from '@/components/RolePill'
import { RoleAutocomplete } from '@/components/RoleAutocomplete'
import { useStore, useGlobalRoles } from '@/hooks/useStore'
import { getCardById } from '@/lib/scryfall'
import type { DeckCard, ScryfallCard, Deck } from '@/types'
import { getCardLimit } from '@/types'
import { getPrimaryType, CARD_TYPE_SORT_ORDER } from '@/lib/constants'

interface DeckListViewProps {
  deck: Deck
  listType: 'cards' | 'alternates' | 'sideboard'
}

export function DeckListView({ deck, listType }: DeckListViewProps) {
  const selectedCards = useStore(state => state.selectedCards)
  const focusedCardId = useStore(state => state.focusedCardId)
  const toggleCardSelection = useStore(state => state.toggleCardSelection)
  const selectAllCards = useStore(state => state.selectAllCards)
  const setFocusedCard = useStore(state => state.setFocusedCard)
  const updateCardInDeck = useStore(state => state.updateCardInDeck)
  const removeCardFromDeck = useStore(state => state.removeCardFromDeck)
  const addRoleToCard = useStore(state => state.addRoleToCard)
  const removeRoleFromCard = useStore(state => state.removeRoleFromCard)
  const globalRoles = useGlobalRoles()

  const [focusedScryfallCard, setFocusedScryfallCard] = useState<ScryfallCard | null>(null)
  const [loadingCard, setLoadingCard] = useState(false)

  // Convert commanders to virtual DeckCard entries for display
  const commanderCards = useMemo((): DeckCard[] => {
    if (!deck.commanders || deck.commanders.length === 0) return []
    return deck.commanders.map((commander): DeckCard => ({
      id: `commander-${commander.name}`,
      card: commander,
      quantity: 1,
      inclusion: 'confirmed',
      ownership: 'owned',
      roles: [],
      isPinned: true,
      addedAt: deck.createdAt,
      addedBy: 'user'
    }))
  }, [deck.commanders, deck.createdAt])

  // Get cards for current list (memoized to prevent infinite re-renders)
  const cards = useMemo(() => {
    if (listType === 'cards') {
      const mainCards = deck.cards.filter(c => c.inclusion !== 'cut')
      // Include commanders at the start of the main deck list
      return [...commanderCards, ...mainCards]
    }
    return deck[listType]
  }, [listType, deck.cards, deck.alternates, deck.sideboard, commanderCards])

  // Group cards by primary type (Creature, Instant, etc.), with Commander as special group
  const groupedCards = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {}
    for (const card of cards) {
      // Commanders get their own group (identified by ID prefix)
      if (card.id.startsWith('commander-')) {
        if (!groups['Commander']) groups['Commander'] = []
        groups['Commander'].push(card)
      } else {
        // Group by card type
        const primaryType = card.typeLine ? getPrimaryType(card.typeLine) : 'Other'
        if (!groups[primaryType]) groups[primaryType] = []
        groups[primaryType].push(card)
      }
    }
    return groups
  }, [cards])

  // Sort groups by type order, with Commander first
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedCards).sort(([a], [b]) => {
      // Put "Commander" at the top
      if (a === 'Commander') return -1
      if (b === 'Commander') return 1
      // Sort by card type order
      const orderA = CARD_TYPE_SORT_ORDER[a] ?? 99
      const orderB = CARD_TYPE_SORT_ORDER[b] ?? 99
      return orderA - orderB
    })
  }, [groupedCards])

  // Auto-focus the first card when deck view opens
  useEffect(() => {
    if (!focusedCardId && sortedGroups.length > 0) {
      const [, firstGroupCards] = sortedGroups[0]
      if (firstGroupCards && firstGroupCards.length > 0) {
        // Sort alphabetically like in the render and focus the first one
        const sortedCards = [...firstGroupCards].sort((a, b) => a.card.name.localeCompare(b.card.name))
        setFocusedCard(sortedCards[0].id)
      }
    }
  }, [deck.id]) // Only run when deck changes, not on every sortedGroups change

  // Find the focused deck card's scryfall ID
  const focusedDeckCard = useMemo(() => {
    if (!focusedCardId) return null
    return cards.find(c => c.id === focusedCardId) || null
  }, [focusedCardId, cards])

  const focusedScryfallId = focusedDeckCard?.card.scryfallId || null

  // Fetch focused card data
  useEffect(() => {
    if (!focusedScryfallId) {
      setFocusedScryfallCard(null)
      return
    }

    // Don't refetch if we already have this card
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

  // Handle quantity change
  const handleQuantityChange = useCallback(async (cardName: string, delta: number) => {
    const card = cards.find(c => c.card.name === cardName)
    if (!card) return

    const maxQty = getCardLimit(card.card.name, deck.format)
    const newQty = Math.max(1, Math.min(maxQty === Infinity ? 99 : maxQty, card.quantity + delta))

    if (newQty !== card.quantity) {
      await updateCardInDeck(deck.id, cardName, { quantity: newQty })
    }
  }, [cards, deck.id, deck.format, updateCardInDeck])

  // Handle delete
  const handleDelete = useCallback(async (cardName: string) => {
    await removeCardFromDeck(deck.id, cardName, listType)
  }, [deck.id, listType, removeCardFromDeck])

  // Handle role add
  const handleAddRole = useCallback(async (cardName: string, roleId: string) => {
    await addRoleToCard(deck.id, cardName, roleId)
  }, [deck.id, addRoleToCard])

  // Handle role remove
  const handleRemoveRole = useCallback(async (cardName: string, roleId: string) => {
    await removeRoleFromCard(deck.id, cardName, roleId)
  }, [deck.id, removeRoleFromCard])

  // Handle notes update
  const handleUpdateNotes = useCallback(async (cardName: string, notes: string | undefined) => {
    await updateCardInDeck(deck.id, cardName, { notes })
  }, [deck.id, updateCardInDeck])

  // Check if all cards in a group are selected
  const isGroupSelected = useCallback((groupCards: DeckCard[]) => {
    return groupCards.every(c => selectedCards.has(c.card.name))
  }, [selectedCards])

  // Toggle group selection
  const toggleGroupSelection = useCallback((groupCards: DeckCard[]) => {
    if (isGroupSelected(groupCards)) {
      groupCards.forEach(c => {
        if (selectedCards.has(c.card.name)) {
          toggleCardSelection(c.card.name)
        }
      })
    } else {
      selectAllCards([...selectedCards, ...groupCards.map(c => c.card.name)])
    }
  }, [isGroupSelected, selectedCards, toggleCardSelection, selectAllCards])

  const selectedCardNames = Array.from(selectedCards)

  return (
    <div className="flex h-full">
      {/* Left column - Focused card image */}
      <div className="w-72 shrink-0 border-r p-4 flex flex-col items-center">
        {loadingCard && (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loadingCard && focusedScryfallCard && (
          <CardImage card={focusedScryfallCard} size="large" />
        )}
        {!loadingCard && !focusedScryfallCard && (
          <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
            Click a card to preview
          </div>
        )}
      </div>

      {/* Right column - Card list */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {sortedGroups.map(([typeName, groupCards]) => {
            const groupCount = groupCards.reduce((sum, c) => sum + c.quantity, 0)
            const groupSelected = isGroupSelected(groupCards)
            const isCommanderGroup = typeName === 'Commander'

            return (
              <CollapsibleSection
                key={typeName}
                title={
                  <div className="flex items-center gap-2">
                    {!isCommanderGroup && (
                      <Checkbox
                        checked={groupSelected}
                        onCheckedChange={() => toggleGroupSelection(groupCards)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    {isCommanderGroup && <div className="w-4" />}
                    <Badge variant={isCommanderGroup ? 'default' : 'secondary'}>
                      {typeName}
                    </Badge>
                  </div>
                }
                badge={`${groupCount}`}
                defaultOpen={true}
              >
                <div className="space-y-1">
                  {groupCards
                    .sort((a, b) => a.card.name.localeCompare(b.card.name))
                    .map((card, index) => (
                      <CardRow
                        key={`${typeName}-${card.card.name}-${card.card.scryfallId || index}`}
                        card={card}
                        deck={deck}
                        globalRoles={globalRoles}
                        isSelected={selectedCards.has(card.card.name)}
                        isFocused={focusedCardId === card.id}
                        isCommander={card.id.startsWith('commander-')}
                        onToggleSelect={() => toggleCardSelection(card.card.name)}
                        onFocus={() => setFocusedCard(card.id)}
                        onQuantityChange={handleQuantityChange}
                        onDelete={handleDelete}
                        onAddRole={(roleId) => handleAddRole(card.card.name, roleId)}
                        onRemoveRole={(roleId) => handleRemoveRole(card.card.name, roleId)}
                        onUpdateNotes={(notes) => handleUpdateNotes(card.card.name, notes)}
                      />
                    ))}
                </div>
              </CollapsibleSection>
            )
          })}

          {cards.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No cards in this list yet.
            </div>
          )}
        </div>
      </div>

      {/* Batch operations toolbar */}
      <BatchOperationsToolbar
        deckId={deck.id}
        selectedCount={selectedCards.size}
        selectedCardNames={selectedCardNames}
        currentListType={listType}
        hasSideboard={deck.format.sideboardSize > 0}
      />

    </div>
  )
}

interface CardRowProps {
  card: DeckCard
  deck: Deck
  globalRoles: import('@/types').RoleDefinition[]
  isSelected: boolean
  isFocused: boolean
  isCommander?: boolean
  onToggleSelect: () => void
  onFocus: () => void
  onQuantityChange: (cardName: string, delta: number) => void
  onDelete: (cardName: string) => void
  onAddRole: (roleId: string) => void
  onRemoveRole: (roleId: string) => void
  onUpdateNotes: (notes: string | undefined) => void
}

function CardRow({
  card,
  deck,
  globalRoles,
  isSelected,
  isFocused,
  isCommander = false,
  onToggleSelect,
  onFocus,
  onQuantityChange,
  onDelete,
  onAddRole,
  onRemoveRole,
  onUpdateNotes
}: CardRowProps) {
  const maxQty = getCardLimit(card.card.name, deck.format)
  const displayRoles = card.roles

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(card.notes || '')

  // Sync notes value when card changes
  useEffect(() => {
    setNotesValue(card.notes || '')
  }, [card.notes])

  const handleSaveNotes = () => {
    const trimmedNotes = notesValue.trim()
    if (trimmedNotes !== (card.notes || '')) {
      onUpdateNotes(trimmedNotes || undefined)
    }
    setIsEditingNotes(false)
  }

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        isFocused ? 'bg-accent' : isSelected ? 'bg-accent/50' : 'hover:bg-accent/30'
      }`}
      onClick={onFocus}
    >
      {/* Checkbox - hidden for commanders */}
      {isCommander ? (
        <div className="w-4" /> // Spacer to maintain alignment
      ) : (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Quantity controls - disabled for commanders */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={e => {
            e.stopPropagation()
            onQuantityChange(card.card.name, -1)
          }}
          disabled={isCommander || card.quantity <= 1}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-5 text-center text-sm font-medium">{card.quantity}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={e => {
            e.stopPropagation()
            onQuantityChange(card.card.name, 1)
          }}
          disabled={isCommander || (maxQty !== Infinity && card.quantity >= maxQty)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Card name - fixed width with truncation */}
      <span className="w-48 truncate font-medium flex-shrink-0">{card.card.name}</span>

      {/* Role section - pills with inline autocomplete */}
      <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0" onClick={e => e.stopPropagation()}>
        {displayRoles.map(roleId => (
          <RolePill
            key={roleId}
            roleId={roleId}
            globalRoles={globalRoles}
            customRoles={deck.customRoles}
            onRemove={isCommander ? undefined : () => onRemoveRole(roleId)}
            disabled={isCommander}
          />
        ))}

        <RoleAutocomplete
          deck={deck}
          existingRoles={card.roles}
          onAdd={onAddRole}
          placeholder={displayRoles.length === 0 ? "No roles" : undefined}
          disabled={isCommander}
        />
      </div>

      {/* Notes - inline editable */}
      <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
        {isEditingNotes ? (
          <textarea
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveNotes()
              }
              if (e.key === 'Escape') {
                setNotesValue(card.notes || '')
                setIsEditingNotes(false)
              }
            }}
            placeholder="Add notes..."
            autoFocus
            rows={3}
            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        ) : (
          <button
            onClick={() => setIsEditingNotes(true)}
            className={`text-xs text-muted-foreground hover:text-foreground text-left w-full whitespace-pre-wrap ${
              isFocused ? '' : 'line-clamp-2'
            }`}
          >
            {card.notes || <span className="italic opacity-50">Add notes...</span>}
          </button>
        )}
      </div>

      {/* Ownership indicator */}
      {card.ownership === 'need_to_buy' && (
        <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs flex-shrink-0">
          Buy
        </Badge>
      )}
      {card.ownership === 'pulled' && (
        <Badge variant="outline" className="text-blue-500 border-blue-500 text-xs flex-shrink-0">
          Pulled
        </Badge>
      )}

      {/* Actions - hidden for commanders */}
      {!isCommander && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive flex-shrink-0"
          onClick={e => {
            e.stopPropagation()
            onDelete(card.card.name)
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
