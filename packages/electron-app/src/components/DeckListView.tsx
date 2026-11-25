import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { CardImage } from '@/components/CardImage'
import { ManaCost } from '@/components/ManaCost'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { BatchOperationsToolbar } from '@/components/BatchOperationsToolbar'
import { RolePill } from '@/components/RolePill'
import { RoleAutocomplete } from '@/components/RoleAutocomplete'
import { CardEditModal } from '@/components/CardEditModal'
import { CardFilterBar } from '@/components/CardFilterBar'
import { useStore, useGlobalRoles } from '@/hooks/useStore'
import { useScryfallCache } from '@/hooks/useScryfallCache'
import { captionLabelStyle, editorialTextStyle, previewPlaceholderStyle } from '@/lib/mastheadStyles'
import type { CardEntry, Deck, CardSetName, RoleDefinition } from '@/types'
import { sortedByName } from '@/lib/deckRows'
import { getCardLimit, isCardFullyPulled, getCardDisplayName, getCanonicalSuffix, OWNERSHIP_STATUS, CARD_SOURCE, CARD_SET } from '@/types'
import { CARD_TYPE_SORT_ORDER, getAllRoles } from '@/lib/constants'
import type { CardFilter } from '@mtg-deckbuilder/shared'
import { enrichCards, applyFilters, getMainboard, getCardSetEntries, getEntryPrimaryType, getCardManaCost } from '@mtg-deckbuilder/shared'

interface DeckListViewProps {
  deck: Deck
  listType: CardSetName
}

export function DeckListView({ deck, listType }: DeckListViewProps) {
  const [filters, setFilters] = useState<CardFilter[]>([])
  const selectedCards = useStore(state => state.selectedCards)
  const focusedCardId = useStore(state => state.focusedCardId)
  const toggleCardSelection = useStore(state => state.toggleCardSelection)
  const selectAllCards = useStore(state => state.selectAllCards)
  const setFocusedCard = useStore(state => state.setFocusedCard)
  const updateCardInDeck = useStore(state => state.updateCardInDeck)
  const adjustCardQuantity = useStore(state => state.adjustCardQuantity)
  const removeCardFromDeck = useStore(state => state.removeCardFromDeck)
  const addRoleToCard = useStore(state => state.addRoleToCard)
  const removeRoleFromCard = useStore(state => state.removeRoleFromCard)
  const globalRoles = useGlobalRoles()

  // Convert commanders to virtual CardEntry entries for display
  const commanderCards = useMemo((): CardEntry[] => {
    if (!deck.commanders || deck.commanders.length === 0) return []
    return deck.commanders.map((commander): CardEntry => ({
      id: `commander-${commander.name}`,
      card: commander,
      quantity: 1,
      ownership: OWNERSHIP_STATUS.UNKNOWN,
      roles: [],
      addedAt: deck.createdAt,
      source: CARD_SOURCE.USER
    }))
  }, [deck.commanders, deck.createdAt])

  // Get cards for current list (memoized to prevent infinite re-renders)
  const cards = useMemo(() => {
    if (listType === CARD_SET.MAINBOARD) {
      // Include commanders at the start of the main deck list
      return [...commanderCards, ...getMainboard(deck)]
    }
    return getCardSetEntries(deck.cardSets, listType)
  }, [listType, deck.cardSets, commanderCards])

  // Scryfall cache for filter enrichment
  const { cache: scryfallCache } = useScryfallCache(cards)

  // Enrich cards once for both filtering and passing to CardFilterBar
  const enriched = useMemo(
    () => enrichCards(cards, scryfallCache),
    [cards, scryfallCache]
  )

  // Apply filters
  const filteredCards = useMemo(() => {
    if (filters.length === 0) return cards
    const filtered = applyFilters(enriched, filters)
    return filtered.map(e => e.deckCard)
  }, [cards, enriched, filters])

  // Group cards by primary type (Creature, Instant, etc.), with Commander as special group
  const groupedCards = useMemo(() => {
    const groups: Record<string, CardEntry[]> = {}
    for (const card of filteredCards) {
      // Commanders get their own group (identified by ID prefix)
      if (card.id.startsWith('commander-')) {
        if (!groups['Commander']) groups['Commander'] = []
        groups['Commander'].push(card)
      } else {
        const primaryType = getEntryPrimaryType(card, scryfallCache)
        if (!groups[primaryType]) groups[primaryType] = []
        groups[primaryType].push(card)
      }
    }
    return groups
  }, [filteredCards, scryfallCache])

  // Sort groups by type order, with Commander first, and each group's cards by name.
  // Sorting here rather than in the render keeps the memoized groups from being
  // re-sorted (and mutated) on every render.
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedCards)
      .sort(([a], [b]) => {
        // Put "Commander" at the top
        if (a === 'Commander') return -1
        if (b === 'Commander') return 1
        // Sort by card type order
        const orderA = CARD_TYPE_SORT_ORDER[a] ?? 99
        const orderB = CARD_TYPE_SORT_ORDER[b] ?? 99
        return orderA - orderB
      })
      .map(([typeName, groupCards]): [string, CardEntry[]] => [typeName, sortedByName(groupCards)])
  }, [groupedCards])

  // Auto-focus the first card when deck view opens
  useEffect(() => {
    if (!focusedCardId && sortedGroups.length > 0) {
      const [, firstGroupCards] = sortedGroups[0]
      if (firstGroupCards && firstGroupCards.length > 0) {
        setFocusedCard(firstGroupCards[0].id)
      }
    }
  }, [deck.id]) // Only run when deck changes, not on every sortedGroups change

  // Find the focused deck card's scryfall ID
  const focusedCardEntry = useMemo(() => {
    if (!focusedCardId) return null
    return cards.find(c => c.id === focusedCardId) || null
  }, [focusedCardId, cards])

  // The deck's card data is already in hand, so the focused card is a lookup, not a
  // fetch: it is there in the same render as the click.
  const focusedScryfallId = focusedCardEntry?.card.scryfallId
  const focusedScryfallCard = focusedScryfallId ? scryfallCache.get(focusedScryfallId) ?? null : null
  const focusedManaCost = getCardManaCost(focusedScryfallCard ?? undefined)

  // The row callbacks below take the row's id or name as an argument and depend only on
  // the deck id, so the same function objects are handed to every row on every render —
  // which is what lets a memoized row skip rendering when its own card has not changed.

  // Handle quantity change
  const handleQuantityChange = useCallback(async (cardId: string, delta: number) => {
    await adjustCardQuantity(deck.id, cardId, delta)
  }, [deck.id, adjustCardQuantity])

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

  // One edit dialog for the whole list, pointed at whichever row asked for it. It stays
  // mounted while closing so the dialog's exit animation can play.
  const [editing, setEditing] = useState<{ cardId: string; isOpen: boolean } | null>(null)
  const editingCard = editing ? cards.find(c => c.id === editing.cardId) : undefined
  const handleEdit = useCallback((cardId: string) => setEditing({ cardId, isOpen: true }), [])
  const handleCloseEdit = useCallback(() => setEditing(prev => prev && { ...prev, isOpen: false }), [])

  // Check if all cards in a group are selected
  const isGroupSelected = useCallback((groupCards: CardEntry[]) => {
    return groupCards.every(c => selectedCards.has(c.card.name))
  }, [selectedCards])

  // Toggle group selection
  const toggleGroupSelection = useCallback((groupCards: CardEntry[]) => {
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

  const focusedRoleNames = focusedCardEntry
    ? getAllRoles(globalRoles, deck.customRoles)
        .filter(r => focusedCardEntry.roles.includes(r.id))
        .map(r => r.name)
    : []

  return (
    <div className="flex h-full">
      {/* Left column — focused card with editorial framing */}
      <div className="w-80 shrink-0 flex flex-col gap-4 p-6" style={{ borderRight: '1px solid var(--border)' }}>
        <span style={captionLabelStyle}>Currently viewing</span>

        {focusedScryfallCard ? (
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
              {focusedScryfallCard.type_line && (
                <span style={captionLabelStyle}>{focusedScryfallCard.type_line}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              {focusedManaCost && (
                <MetaRow label="Cost">
                  <ManaCost cost={focusedManaCost} size="sm" />
                </MetaRow>
              )}
              {focusedScryfallCard.set_name && (
                <MetaRow label="Printing">
                  <span style={editorialTextStyle}>{focusedScryfallCard.set_name}</span>
                </MetaRow>
              )}
              {focusedRoleNames.length > 0 && (
                <MetaRow label="Roles">
                  <span style={editorialTextStyle}>
                    {focusedRoleNames.map(n => n.toLowerCase()).join(' · ')}
                  </span>
                </MetaRow>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-center" style={previewPlaceholderStyle}>
            {/* A focused card whose data has not arrived yet holds the space under its
                own name rather than inviting a click that has already happened. */}
            {focusedCardEntry ? focusedCardEntry.card.name : 'click a card to preview'}
          </div>
        )}
      </div>

      {/* Right column - Card list */}
      <div className="flex-1 overflow-auto p-4">
        <CardFilterBar
          filters={filters}
          onChange={setFilters}
          allowedGroups={['mana', 'type', 'role', 'status']}
          deck={deck}
          enrichedCards={enriched}
        />
        <div className="space-y-4">
          {sortedGroups.map(([typeName, groupCards]) => {
            const groupCount = groupCards.reduce((sum, c) => sum + c.quantity, 0)
            const groupSelected = isGroupSelected(groupCards)
            const isCommanderGroup = typeName === 'Commander'

            return (
              <CollapsibleSection
                key={typeName}
                title={
                  <div className="flex items-center gap-3">
                    {!isCommanderGroup && (
                      <Checkbox
                        checked={groupSelected}
                        onCheckedChange={() => toggleGroupSelection(groupCards)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    {isCommanderGroup && <div className="w-4" />}
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        fontWeight: isCommanderGroup ? 700 : 600,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: isCommanderGroup ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {typeName}
                    </span>
                  </div>
                }
                badge={groupCount}
                defaultOpen={true}
              >
                <div className="space-y-1">
                  {groupCards.map(card => (
                    <CardRow
                      key={card.id}
                      card={card}
                      maxQty={getCardLimit(card.card.name, deck.format)}
                      globalRoles={globalRoles}
                      customRoles={deck.customRoles}
                      isSelected={selectedCards.has(card.card.name)}
                      isFocused={focusedCardId === card.id}
                      isCommander={card.id.startsWith('commander-')}
                      onToggleSelect={toggleCardSelection}
                      onFocus={setFocusedCard}
                      onQuantityChange={handleQuantityChange}
                      onDelete={handleDelete}
                      onAddRole={handleAddRole}
                      onRemoveRole={handleRemoveRole}
                      onUpdateNotes={handleUpdateNotes}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )
          })}

          {cards.length === 0 && (
            <div
              className="flex items-center justify-center h-32"
              style={{
                fontFamily: 'var(--font-tagline)',
                fontStyle: 'italic',
                fontSize: '16px',
                color: 'var(--muted-foreground)',
              }}
            >
              no cards in this list yet
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

      {editing && editingCard && (
        <CardEditModal
          key={editingCard.id}
          isOpen={editing.isOpen}
          onClose={handleCloseEdit}
          card={editingCard}
          deckId={deck.id}
          listType={listType}
        />
      )}
    </div>
  )
}

// Every prop is either a primitive, an object whose identity survives edits to other
// cards (the entry itself, the role lists), or a callback that never changes — so the
// memo below holds, and editing or focusing one card re-renders one or two rows rather
// than the whole list. The callbacks take the row's id or name for the same reason: a
// per-row closure would be a new function, and a changed prop, on every render.
interface CardRowProps {
  card: CardEntry
  maxQty: number
  globalRoles: RoleDefinition[]
  customRoles: RoleDefinition[]
  isSelected: boolean
  isFocused: boolean
  isCommander?: boolean
  onToggleSelect: (cardName: string) => void
  onFocus: (cardId: string) => void
  onQuantityChange: (cardId: string, delta: number) => void
  onDelete: (cardName: string) => void
  onAddRole: (cardName: string, roleId: string) => void
  onRemoveRole: (cardName: string, roleId: string) => void
  onUpdateNotes: (cardName: string, notes: string | undefined) => void
  onEdit: (cardId: string) => void
}

const CardRow = memo(function CardRow({
  card,
  maxQty,
  globalRoles,
  customRoles,
  isSelected,
  isFocused,
  isCommander = false,
  onToggleSelect,
  onFocus,
  onQuantityChange,
  onDelete,
  onAddRole,
  onRemoveRole,
  onUpdateNotes,
  onEdit
}: CardRowProps) {
  const cardName = card.card.name
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
      onUpdateNotes(cardName, trimmedNotes || undefined)
    }
    setIsEditingNotes(false)
  }

  return (
    <div
      className="flex items-center gap-2 cursor-pointer transition-colors"
      style={{
        padding: '8px 4px',
        borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
        backgroundColor: isFocused
          ? 'color-mix(in srgb, var(--foreground) 8%, transparent)'
          : isSelected
            ? 'color-mix(in srgb, var(--foreground) 4%, transparent)'
            : 'transparent',
      }}
      onClick={() => onFocus(card.id)}
    >
      {/* Checkbox - hidden for commanders */}
      {isCommander ? (
        <div className="w-4" /> // Spacer to maintain alignment
      ) : (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(cardName)}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Quantity controls - disabled for commanders */}
      <div
        className="flex items-center gap-1.5"
        style={{ opacity: isCommander ? 0.4 : 1 }}
      >
        <button
          type="button"
          className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            width: '20px',
            height: '20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
          }}
          onClick={e => {
            e.stopPropagation()
            onQuantityChange(card.id, -1)
          }}
          disabled={isCommander || card.quantity <= 1}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span
          style={{
            width: '16px',
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--foreground)',
          }}
        >
          {card.quantity}
        </span>
        <button
          type="button"
          className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            width: '20px',
            height: '20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
          }}
          onClick={e => {
            e.stopPropagation()
            onQuantityChange(card.id, 1)
          }}
          disabled={isCommander || (maxQty !== Infinity && card.quantity >= maxQty)}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Card name - fixed width with truncation */}
      <span className="w-48 truncate font-medium flex-shrink-0">
        {getCardDisplayName(card.card)}
        {getCanonicalSuffix(card.card) && (
          <span className="text-xs text-muted-foreground ml-1">({card.card.name})</span>
        )}
      </span>

      {/* Role section - pills with inline autocomplete */}
      <div className="flex items-center gap-1 flex-wrap w-64 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {displayRoles.map(roleId => (
          <RolePill
            key={roleId}
            roleId={roleId}
            globalRoles={globalRoles}
            customRoles={customRoles}
            onRemove={isCommander ? undefined : () => onRemoveRole(cardName, roleId)}
            disabled={isCommander}
          />
        ))}

        <RoleAutocomplete
          customRoles={customRoles}
          existingRoles={card.roles}
          onAdd={roleId => onAddRole(cardName, roleId)}
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
            placeholder="add notes…"
            autoFocus
            rows={3}
            className="w-full resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              padding: '4px 8px',
              border: '1px solid var(--input)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
            }}
          />
        ) : (
          <button
            onClick={() => setIsEditingNotes(true)}
            className={`text-left w-full hover:opacity-80 transition-opacity ${
              isFocused ? 'whitespace-pre-wrap' : 'truncate'
            }`}
            style={{
              fontFamily: 'var(--font-tagline)',
              fontSize: '12px',
              fontStyle: 'italic',
              color: card.notes ? 'var(--foreground)' : 'var(--muted-foreground)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {card.notes || 'add notes…'}
          </button>
        )}
      </div>

      {/* Ownership indicator - fixed width to prevent layout shift */}
      <div className="w-16 flex-shrink-0 flex justify-end">
        {card.ownership === OWNERSHIP_STATUS.NEED_TO_BUY && (
          <span
            style={{
              padding: '2px 8px',
              border: '1px solid var(--ring)',
              color: 'var(--ring)',
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Buy
          </span>
        )}
        {isCardFullyPulled(card) && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
            }}
          >
            Pulled
          </span>
        )}
      </div>

      {/* Actions - hidden for commanders */}
      {!isCommander ? (
        <div className="flex items-center gap-3 flex-shrink-0 justify-end" style={{ width: '52px' }}>
          <button
            type="button"
            className="hover:opacity-80 transition-opacity"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--muted-foreground)',
            }}
            onClick={e => {
              e.stopPropagation()
              onEdit(card.id)
            }}
            title="Edit card"
          >
            edit
          </button>
          <button
            type="button"
            className="hover:opacity-80 transition-opacity"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--destructive)',
              lineHeight: 1,
            }}
            onClick={e => {
              e.stopPropagation()
              onDelete(cardName)
            }}
            title="Remove card"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0" style={{ width: '52px' }} />
      )}
    </div>
  )
})

// Caption label + value row used by the focused-card panel for Cost / Printing / Roles.
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span style={{ ...captionLabelStyle, minWidth: '56px' }}>{label}</span>
      {children}
    </div>
  )
}
