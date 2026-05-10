import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ArrowLeft, Trash2, Loader2, Search, MoreVertical, Pencil, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/hooks/useStore'
import { autocomplete, searchCardByName, getCardById, getCardImageUrl, listLegalities } from '@/lib/scryfall'
import { AUTOCOMPLETE } from '@/lib/constants'
import type { CardEntry, CardList, ScryfallCard, FormatType } from '@/types'
import {
  CARD_LIST_KIND_LABELS,
  INTEREST_LIST_ID,
  createCardIdentifier,
  getCardListKind,
  getPotentialDecks,
} from '@/types'
import { ImportToListDialog } from '@/components/ImportToListDialog'

export function CardListView() {
  const cardLists = useStore(state => state.cardLists)
  const selectedCardListId = useStore(state => state.selectedCardListId)
  const list = useMemo<CardList | null>(
    () => cardLists.find(l => l.id === selectedCardListId) ?? null,
    [cardLists, selectedCardListId],
  )

  const decks = useStore(state => state.decks)
  const addCardToList = useStore(state => state.addCardToList)
  const removeCardFromList = useStore(state => state.removeCardFromList)
  const updateCardInList = useStore(state => state.updateCardInList)
  const renameCardList = useStore(state => state.renameCardList)
  const deleteCardList = useStore(state => state.deleteCardList)
  const setView = useStore(state => state.setView)
  const selectCardList = useStore(state => state.selectCardList)
  const selectDeck = useStore(state => state.selectDeck)

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const activeCard = selectedCard ?? hoveredCard
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchQuery.length < AUTOCOMPLETE.MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const results = await autocomplete(searchQuery)
      setSuggestions(results.slice(0, AUTOCOMPLETE.MAX_SUGGESTIONS))
      setShowSuggestions(results.length > 0)
    }, AUTOCOMPLETE.DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!activeCard) {
      setActiveImageUrl(null)
      return
    }
    const items = list?.cardSets[0]?.entries ?? []
    const item = items.find(i => i.card.name === activeCard)
    if (!item) return
    if (item.card.scryfallId) {
      setActiveImageUrl(`https://api.scryfall.com/cards/${item.card.scryfallId}?format=image&version=normal`)
    } else {
      searchCardByName(item.card.name).then(card => {
        if (card) setActiveImageUrl(getCardImageUrl(card))
      })
    }
  }, [activeCard, list])

  const handleAddCard = useCallback(async (name: string) => {
    if (!list) return
    setIsLoading(true)
    setShowSuggestions(false)
    setSearchQuery('')
    try {
      const card = await searchCardByName(name)
      if (card) {
        await addCardToList(list.id, createCardIdentifier(card), undefined, 'user')
        // Persist into the local cache so format-legality and previews can resolve it.
        window.electronAPI.saveCachedCards([card]).catch((err: unknown) =>
          console.error('Failed to cache added card:', err),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [addCardToList, list])

  const handleRemove = useCallback(async (cardName: string) => {
    if (!list) return
    await removeCardFromList(list.id, cardName)
  }, [removeCardFromList, list])

  const handleNotesChange = useCallback(async (cardName: string, notes: string) => {
    if (!list) return
    await updateCardInList(list.id, cardName, { notes })
  }, [updateCardInList, list])

  const handleNavigateToDeck = useCallback((deckId: string) => {
    selectDeck(deckId)
  }, [selectDeck])

  const handleRename = useCallback(async () => {
    if (!list) return
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== list.name) {
      await renameCardList(list.id, { name: trimmed })
    }
    setIsRenaming(false)
  }, [list, nameDraft, renameCardList])

  const handleDelete = useCallback(async () => {
    if (!list) return
    if (list.id === INTEREST_LIST_ID) return
    if (!confirm(`Delete list "${list.name}"? This cannot be undone.`)) return
    await deleteCardList(list.id)
    selectCardList(null)
  }, [list, deleteCardList, selectCardList])

  if (!list) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>List not found.</p>
      </div>
    )
  }

  const items = list.cardSets[0]?.entries ?? []
  const kindLabel = CARD_LIST_KIND_LABELS[getCardListKind(list)]
  const isWellKnownInterest = list.id === INTEREST_LIST_ID

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setView('lists')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {isRenaming ? (
            <Input
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setNameDraft(list.name); setIsRenaming(false) }
              }}
              autoFocus
              className="max-w-md"
            />
          ) : (
            <h1 className="text-xl font-bold">{list.name}</h1>
          )}
          <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wide">
            {kindLabel}
          </span>
          <span className="text-muted-foreground">
            {items.length} {items.length === 1 ? 'card' : 'cards'}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <ImportToListDialog listId={list.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={e => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => { setNameDraft(list.name); setIsRenaming(true) }}>
                  <Pencil className="w-4 h-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isWellKnownInterest}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {list.description && (
          <p className="text-sm text-muted-foreground mb-3">{list.description}</p>
        )}

        <div className="relative max-w-md" ref={containerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Add card to list..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="pl-9"
              disabled={isLoading}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
              {suggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => handleAddCard(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="mb-2">No cards in this list yet.</p>
              <p className="text-sm">
                Use the search above to add cards, or
                {' '}<Upload className="inline w-3 h-3 mx-1" /> Import a decklist.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <ListItemRow
                  key={item.id}
                  item={item}
                  decks={decks}
                  onRemove={handleRemove}
                  onNotesChange={handleNotesChange}
                  onNavigateToDeck={handleNavigateToDeck}
                  onHover={setHoveredCard}
                  onSelect={setSelectedCard}
                  isHovered={hoveredCard === item.card.name}
                  isSelected={selectedCard === item.card.name}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-72 p-4 border-l shrink-0 flex flex-col gap-4">
          <LegalityPanel entries={items} />
          {activeImageUrl ? (
            <img src={activeImageUrl} alt="Card preview" className="rounded-lg shadow-lg w-full" />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Select a card to preview
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface LegalityPanelProps {
  entries: CardEntry[]
}

function LegalityPanel({ entries }: LegalityPanelProps) {
  const [resolved, setResolved] = useState<ScryfallCard[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (entries.length === 0) {
      setResolved([])
      return
    }
    setIsLoading(true)
    const ids = entries.map(e => e.card.scryfallId).filter((id): id is string => Boolean(id))
    ;(async () => {
      const cached = (await window.electronAPI.getCachedCards(ids)) as Record<string, ScryfallCard>
      if (cancelled) return

      // Back-fill cards that aren't yet cached (e.g. lists imported before
      // import-time caching landed). Hits Scryfall once per missing card,
      // then writes them to the local cache so subsequent renders are fast.
      const missingIds = ids.filter(id => !cached[id])
      if (missingIds.length === 0) {
        setResolved(Object.values(cached))
        setIsLoading(false)
        return
      }

      const fetched: ScryfallCard[] = []
      for (const id of missingIds) {
        if (cancelled) return
        const card = await getCardById(id)
        if (card) fetched.push(card as ScryfallCard)
      }
      if (cancelled) return
      if (fetched.length > 0) {
        window.electronAPI.saveCachedCards(fetched).catch((err: unknown) =>
          console.error('Failed to cache backfilled cards:', err),
        )
      }
      setResolved([...Object.values(cached), ...fetched])
      setIsLoading(false)
    })()
    return () => { cancelled = true }
  }, [entries])

  const legalities = useMemo(() => listLegalities(resolved), [resolved])
  const formatLabel = (f: FormatType) => f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

  if (entries.length === 0) return null

  return (
    <div className="border rounded-md p-3 text-xs space-y-2">
      <div className="font-medium text-sm">Format legality</div>
      {isLoading && resolved.length === 0 ? (
        <div className="text-muted-foreground">Resolving cards…</div>
      ) : (
        <>
          <div>
            <div className="text-muted-foreground mb-1">All cards legal in:</div>
            {legalities.intersection.length === 0 ? (
              <div className="text-muted-foreground italic">None</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {legalities.intersection.map(f => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {formatLabel(f)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Some cards legal in:</div>
            {legalities.someLegal.length === 0 ? (
              <div className="text-muted-foreground italic">None</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {legalities.someLegal.map(f => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {formatLabel(f)}
                  </span>
                ))}
              </div>
            )}
          </div>
          {legalities.someBanned.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1">Some cards banned in:</div>
              <div className="flex flex-wrap gap-1">
                {legalities.someBanned.map(f => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                    {formatLabel(f)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ListItemRowProps {
  item: CardEntry
  decks: { id: string; name: string }[]
  onRemove: (cardName: string) => void
  onNotesChange: (cardName: string, notes: string) => void
  onNavigateToDeck: (deckId: string) => void
  onHover: (cardName: string | null) => void
  onSelect: (cardName: string) => void
  isHovered: boolean
  isSelected: boolean
}

function ListItemRow({
  item, decks, onRemove, onNotesChange, onNavigateToDeck, onHover, onSelect, isHovered, isSelected,
}: ListItemRowProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(item.notes || '')

  const handleSaveNotes = () => {
    if (notesValue !== item.notes) onNotesChange(item.card.name, notesValue)
    setIsEditingNotes(false)
  }

  const potentialDeckNames = getPotentialDecks(item)
    .map(id => decks.find(d => d.id === id))
    .filter(Boolean)

  return (
    <Card
      className={`transition-colors cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''} ${isHovered ? 'bg-accent/50' : ''}`}
      onClick={() => onSelect(item.card.name)}
      onMouseEnter={() => onHover(item.card.name)}
      onMouseLeave={() => onHover(null)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {item.quantity > 1 && <span className="text-muted-foreground mr-1">{item.quantity}×</span>}
              {item.card.name}
            </h3>
            <div className="mt-2">
              {isEditingNotes ? (
                <Input
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  onBlur={handleSaveNotes}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNotes()
                    if (e.key === 'Escape') { setNotesValue(item.notes || ''); setIsEditingNotes(false) }
                  }}
                  placeholder="Add notes..."
                  autoFocus
                  className="text-sm"
                />
              ) : (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-sm text-muted-foreground hover:text-foreground text-left w-full"
                >
                  {item.notes || 'Add notes...'}
                </button>
              )}
            </div>
            {potentialDeckNames.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">For:</span>
                {potentialDeckNames.map(deck => deck && (
                  <button
                    key={deck.id}
                    onClick={() => onNavigateToDeck(deck.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    {deck.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              {item.source && <span>Source: {item.source}</span>}
              <span>Added: {new Date(item.addedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemove(item.card.name)} className="shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
