import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trash2, Plus, Minus, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CardImage } from '@/components/CardImage'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { BatchOperationsToolbar } from '@/components/BatchOperationsToolbar'
import { RoleEditModal } from '@/components/RoleEditModal'
import { useStore } from '@/hooks/useStore'
import { getCardById } from '@/lib/scryfall'
import type { DeckCard, ScryfallCard, Deck, CustomRoleDefinition, CardRole, BuiltInCardRole } from '@/types'
import { getRoleImportance, isBuiltInRole, getCardLimit } from '@/types'

interface DeckListViewProps {
  deck: Deck
  listType: 'cards' | 'alternates' | 'sideboard'
}

const BUILT_IN_ROLE_COLORS: Record<BuiltInCardRole, string> = {
  commander: 'bg-purple-600',
  core: 'bg-blue-600',
  enabler: 'bg-green-600',
  support: 'bg-yellow-600',
  flex: 'bg-orange-600',
  land: 'bg-stone-600'
}

function getRoleColor(role: string, customRoles?: CustomRoleDefinition[]): string {
  if (isBuiltInRole(role)) {
    return BUILT_IN_ROLE_COLORS[role]
  }
  const customRole = customRoles?.find(r => r.id === role)
  return customRole?.color || 'bg-gray-600'
}

function getRoleName(role: string, customRoles?: CustomRoleDefinition[]): string {
  if (isBuiltInRole(role)) {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }
  const customRole = customRoles?.find(r => r.id === role)
  return customRole?.name || role
}

export function DeckListView({ deck, listType }: DeckListViewProps) {
  const selectedCards = useStore(state => state.selectedCards)
  const focusedCardId = useStore(state => state.focusedCardId)
  const toggleCardSelection = useStore(state => state.toggleCardSelection)
  const selectAllCards = useStore(state => state.selectAllCards)
  const setFocusedCard = useStore(state => state.setFocusedCard)
  const updateCardInDeck = useStore(state => state.updateCardInDeck)
  const removeCardFromDeck = useStore(state => state.removeCardFromDeck)
  const updateDeck = useStore(state => state.updateDeck)

  const [focusedScryfallCard, setFocusedScryfallCard] = useState<ScryfallCard | null>(null)
  const [loadingCard, setLoadingCard] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleEditCard, setRoleEditCard] = useState<DeckCard | null>(null)

  // Get cards for current list (memoized to prevent infinite re-renders)
  const cards = useMemo(() => {
    return listType === 'cards'
      ? deck.cards.filter(c => c.inclusion !== 'cut')
      : deck[listType]
  }, [listType, deck.cards, deck.alternates, deck.sideboard])

  // Group cards by role
  const groupedCards = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {}
    for (const card of cards) {
      if (!groups[card.role]) groups[card.role] = []
      groups[card.role].push(card)
    }
    return groups
  }, [cards])

  // Sort groups by role importance
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedCards).sort(
      ([a], [b]) => getRoleImportance(b, deck.customRoles) - getRoleImportance(a, deck.customRoles)
    )
  }, [groupedCards, deck.customRoles])

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

  // Handle role change
  const handleRoleChange = useCallback(async (cardName: string, role: CardRole) => {
    await updateCardInDeck(deck.id, cardName, { role })
  }, [deck.id, updateCardInDeck])

  // Handle delete
  const handleDelete = useCallback(async (cardName: string) => {
    await removeCardFromDeck(deck.id, cardName, listType)
  }, [deck.id, listType, removeCardFromDeck])

  // Handle custom roles save
  const handleSaveCustomRoles = useCallback(async (customRoles: CustomRoleDefinition[]) => {
    await updateDeck({ ...deck, customRoles })
  }, [deck, updateDeck])

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
          {sortedGroups.map(([role, groupCards]) => {
            const groupCount = groupCards.reduce((sum, c) => sum + c.quantity, 0)
            const groupSelected = isGroupSelected(groupCards)

            return (
              <CollapsibleSection
                key={role}
                title={
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={groupSelected}
                      onCheckedChange={() => toggleGroupSelection(groupCards)}
                      onClick={e => e.stopPropagation()}
                    />
                    <Badge className={getRoleColor(role, deck.customRoles)}>
                      {getRoleName(role, deck.customRoles)}
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
                        key={`${role}-${card.card.name}-${card.card.scryfallId || index}`}
                        card={card}
                        deck={deck}
                        isSelected={selectedCards.has(card.card.name)}
                        isFocused={focusedCardId === card.id}
                        onToggleSelect={() => toggleCardSelection(card.card.name)}
                        onFocus={() => setFocusedCard(card.id)}
                        onQuantityChange={handleQuantityChange}
                        onDelete={handleDelete}
                        onEditRole={() => {
                          setRoleEditCard(card)
                          setRoleModalOpen(true)
                        }}
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

      {/* Role edit modal */}
      <RoleEditModal
        isOpen={roleModalOpen}
        onClose={() => {
          setRoleModalOpen(false)
          setRoleEditCard(null)
        }}
        customRoles={deck.customRoles}
        onSave={handleSaveCustomRoles}
        cardToAssign={roleEditCard ? {
          name: roleEditCard.card.name,
          currentRole: roleEditCard.role
        } : undefined}
        onAssignRole={roleEditCard ? (role) => {
          handleRoleChange(roleEditCard.card.name, role)
          setRoleEditCard(null)
        } : undefined}
      />
    </div>
  )
}

interface CardRowProps {
  card: DeckCard
  deck: Deck
  isSelected: boolean
  isFocused: boolean
  onToggleSelect: () => void
  onFocus: () => void
  onQuantityChange: (cardName: string, delta: number) => void
  onDelete: (cardName: string) => void
  onEditRole: () => void
}

function CardRow({
  card,
  deck,
  isSelected,
  isFocused,
  onToggleSelect,
  onFocus,
  onQuantityChange,
  onDelete,
  onEditRole
}: CardRowProps) {
  const maxQty = getCardLimit(card.card.name, deck.format)

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        isFocused ? 'bg-accent' : isSelected ? 'bg-accent/50' : 'hover:bg-accent/30'
      }`}
      onClick={onFocus}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        onClick={e => e.stopPropagation()}
      />

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={e => {
            e.stopPropagation()
            onQuantityChange(card.card.name, -1)
          }}
          disabled={card.quantity <= 1}
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
          disabled={maxQty !== Infinity && card.quantity >= maxQty}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Card name */}
      <span className="flex-1 truncate font-medium">{card.card.name}</span>

      {/* Ownership indicator */}
      {card.ownership === 'need_to_buy' && (
        <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
          Buy
        </Badge>
      )}
      {card.ownership === 'pulled' && (
        <Badge variant="outline" className="text-blue-500 border-blue-500 text-xs">
          Pulled
        </Badge>
      )}

      {/* Actions */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={e => {
          e.stopPropagation()
          onEditRole()
        }}
      >
        <Pencil className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive"
        onClick={e => {
          e.stopPropagation()
          onDelete(card.card.name)
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  )
}
