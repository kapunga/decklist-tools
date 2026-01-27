import { useState, useCallback, useRef, useEffect } from 'react'
import { ArrowLeft, Trash2, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useStore } from '@/hooks/useStore'
import { autocomplete, searchCardByName, getCardImageUrl } from '@/lib/scryfall'
import { AUTOCOMPLETE } from '@/lib/constants'
import type { InterestItem } from '@/types'

export function InterestListView() {
  const interestList = useStore(state => state.interestList)
  const decks = useStore(state => state.decks)
  const addToInterestList = useStore(state => state.addToInterestList)
  const removeFromInterestList = useStore(state => state.removeFromInterestList)
  const updateInterestItem = useStore(state => state.updateInterestItem)
  const setView = useStore(state => state.setView)
  const selectDeck = useStore(state => state.selectDeck)

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
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

  // Fetch image on hover
  useEffect(() => {
    if (!hoveredCard) {
      setHoveredImageUrl(null)
      return
    }

    const item = interestList?.items.find(i => i.card.name === hoveredCard)
    if (!item) return

    if (item.card.scryfallId) {
      setHoveredImageUrl(`https://api.scryfall.com/cards/${item.card.scryfallId}?format=image&version=normal`)
    } else {
      // Fetch from name
      searchCardByName(item.card.name).then(card => {
        if (card) {
          setHoveredImageUrl(getCardImageUrl(card))
        }
      })
    }
  }, [hoveredCard, interestList])

  const handleAddCard = useCallback(async (name: string) => {
    setIsLoading(true)
    setShowSuggestions(false)
    setSearchQuery('')

    try {
      const card = await searchCardByName(name)
      if (card) {
        await addToInterestList({
          scryfallId: card.id,
          name: card.name,
          setCode: card.set,
          collectorNumber: card.collector_number
        }, undefined, 'manual')
      }
    } finally {
      setIsLoading(false)
    }
  }, [addToInterestList])

  const handleRemove = useCallback(async (cardName: string) => {
    await removeFromInterestList(cardName)
  }, [removeFromInterestList])

  const handleNotesChange = useCallback(async (cardName: string, notes: string) => {
    await updateInterestItem(cardName, { notes })
  }, [updateInterestItem])

  const handleNavigateToDeck = useCallback((deckId: string) => {
    selectDeck(deckId)
  }, [selectDeck])

  const items = interestList?.items || []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setView('decks')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Interest List</h1>
          <span className="text-muted-foreground">
            {items.length} {items.length === 1 ? 'card' : 'cards'}
          </span>
        </div>

        {/* Search to add cards */}
        <div className="relative max-w-md" ref={containerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Add card to interest list..."
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="mb-2">No cards in your interest list yet.</p>
            <p className="text-sm">Use the search above to add cards you're interested in.</p>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Card List */}
            <div className="flex-1 space-y-2">
              {items.map(item => (
                <InterestListItem
                  key={item.id}
                  item={item}
                  decks={decks}
                  onRemove={handleRemove}
                  onNotesChange={handleNotesChange}
                  onNavigateToDeck={handleNavigateToDeck}
                  onHover={setHoveredCard}
                  isHovered={hoveredCard === item.card.name}
                />
              ))}
            </div>

            {/* Hover Preview */}
            {hoveredImageUrl && (
              <div className="w-64 sticky top-0 shrink-0">
                <img
                  src={hoveredImageUrl}
                  alt="Card preview"
                  className="rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface InterestListItemProps {
  item: InterestItem
  decks: { id: string; name: string }[]
  onRemove: (cardName: string) => void
  onNotesChange: (cardName: string, notes: string) => void
  onNavigateToDeck: (deckId: string) => void
  onHover: (cardName: string | null) => void
  isHovered: boolean
}

function InterestListItem({
  item,
  decks,
  onRemove,
  onNotesChange,
  onNavigateToDeck,
  onHover,
  isHovered
}: InterestListItemProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(item.notes || '')

  const handleSaveNotes = () => {
    if (notesValue !== item.notes) {
      onNotesChange(item.card.name, notesValue)
    }
    setIsEditingNotes(false)
  }

  // Get deck names for potential decks
  const potentialDeckNames = (item.potentialDecks || [])
    .map(id => decks.find(d => d.id === id))
    .filter(Boolean)

  return (
    <Card
      className={`transition-colors ${isHovered ? 'bg-accent/50' : ''}`}
      onMouseEnter={() => onHover(item.card.name)}
      onMouseLeave={() => onHover(null)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{item.card.name}</h3>

            {/* Notes */}
            <div className="mt-2">
              {isEditingNotes ? (
                <Input
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  onBlur={handleSaveNotes}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNotes()
                    if (e.key === 'Escape') {
                      setNotesValue(item.notes || '')
                      setIsEditingNotes(false)
                    }
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

            {/* Potential decks */}
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

            {/* Metadata */}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              {item.source && <span>Source: {item.source}</span>}
              <span>Added: {new Date(item.addedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.card.name)}
            className="shrink-0"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
