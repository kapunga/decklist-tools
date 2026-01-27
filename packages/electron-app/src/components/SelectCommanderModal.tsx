import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CardImage } from '@/components/CardImage'
import { ColorPips } from '@/components/ColorPips'
import type { ScryfallCard, DeckCard } from '@/types'
import { searchCardByName, searchCards } from '@/lib/scryfall'
import { AUTOCOMPLETE } from '@/lib/constants'

interface SelectCommanderModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (commander: ScryfallCard) => void
  title?: string
  description?: string
  // For post-import selection: list of legendary creatures already in deck
  existingLegendaries?: DeckCard[]
  // For commander swap: only allow same color identity
  requiredColorIdentity?: string[]
}

export function SelectCommanderModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Commander',
  description = 'Search for a legendary creature to be your commander.',
  existingLegendaries,
  requiredColorIdentity
}: SelectCommanderModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSuggestions([])
      setSelectedCard(null)
      setIsLoading(false)
      setShowSuggestions(false)
      // Focus input after a short delay (for animation)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

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

  // Debounced search for legendary creatures
  useEffect(() => {
    if (searchQuery.length < AUTOCOMPLETE.MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      // Search for legendary creatures
      const result = await searchCards(`${searchQuery} t:legendary t:creature`)
      if (result?.data) {
        const names = result.data
          .filter(card => {
            // If requiredColorIdentity is set, filter by color identity
            if (requiredColorIdentity !== undefined) {
              const cardColors = new Set(card.color_identity)
              const requiredColors = new Set(requiredColorIdentity)
              // Colors must match exactly for commander swap
              if (cardColors.size !== requiredColors.size) return false
              for (const color of cardColors) {
                if (!requiredColors.has(color)) return false
              }
            }
            return true
          })
          .map(card => card.name)
          .slice(0, AUTOCOMPLETE.MAX_SUGGESTIONS)

        setSuggestions(names)
        setShowSuggestions(names.length > 0)
      }
    }, AUTOCOMPLETE.DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQuery, requiredColorIdentity])

  const handleSelectSuggestion = useCallback(async (name: string) => {
    setIsLoading(true)
    setShowSuggestions(false)
    setSearchQuery(name)

    try {
      const card = await searchCardByName(name)
      if (card) {
        setSelectedCard(card)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelectExisting = useCallback(async (deckCard: DeckCard) => {
    setIsLoading(true)
    try {
      const card = await searchCardByName(deckCard.card.name)
      if (card) {
        setSelectedCard(card)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedCard) {
      onSelect(selectedCard)
    }
  }, [selectedCard, onSelect])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="relative" ref={containerRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search for legendary creatures..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="pl-9"
              />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => handleSelectSuggestion(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Existing legendaries (for post-import) */}
          {existingLegendaries && existingLegendaries.length > 0 && !selectedCard && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Or select from legendary creatures in your deck:
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                {existingLegendaries.map((deckCard, index) => (
                  <button
                    key={`${deckCard.card.name}-${deckCard.card.scryfallId || index}`}
                    type="button"
                    className="text-left p-2 rounded-md border hover:bg-accent text-sm"
                    onClick={() => handleSelectExisting(deckCard)}
                  >
                    {deckCard.card.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Selected card preview */}
          {selectedCard && !isLoading && (
            <div className="flex gap-4">
              <div className="shrink-0" style={{ width: 200 }}>
                <CardImage card={selectedCard} size="normal" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">{selectedCard.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedCard.type_line}</p>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Color Identity:</span>
                  <ColorPips colors={selectedCard.color_identity} size="md" />
                </div>

                {selectedCard.oracle_text && (
                  <p className="text-sm whitespace-pre-wrap">{selectedCard.oracle_text}</p>
                )}

                <div className="pt-2">
                  <Button onClick={() => setSelectedCard(null)} variant="outline" size="sm">
                    Choose Different
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedCard}>
            <Check className="w-4 h-4 mr-2" />
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
