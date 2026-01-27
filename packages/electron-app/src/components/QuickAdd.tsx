import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useStore } from '@/hooks/useStore'
import { autocomplete, searchCardByName } from '@/lib/scryfall'
import { AUTOCOMPLETE } from '@/lib/constants'
import { CardAddModal } from '@/components/CardAddModal'
import type { DeckCard, ScryfallCard, DeckFormat, RoleDefinition } from '@/types'
import { generateDeckCardId } from '@/types'

interface QuickAddProps {
  deckId: string
  format: DeckFormat
  colorIdentity?: string[]  // For commander format filtering
  customRoles?: RoleDefinition[]
}

interface DropdownState {
  suggestions: string[]
  selectedIndex: number
  isVisible: boolean
}

const initialDropdownState: DropdownState = {
  suggestions: [],
  selectedIndex: -1,
  isVisible: false
}

export function QuickAdd({ deckId, format, colorIdentity, customRoles }: QuickAddProps) {
  const [inputValue, setInputValue] = useState('')
  const [dropdown, setDropdown] = useState<DropdownState>(initialDropdownState)
  const [isLoading, setIsLoading] = useState(false)

  // Modal state
  const [pendingCard, setPendingCard] = useState<ScryfallCard | null>(null)
  const [initialQuantity, setInitialQuantity] = useState(1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addCardToDeck = useStore(state => state.addCardToDeck)

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdown(prev => ({ ...prev, isVisible: false }))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced autocomplete
  useEffect(() => {
    if (inputValue.length < AUTOCOMPLETE.MIN_QUERY_LENGTH) {
      setDropdown(initialDropdownState)
      return
    }

    const timer = setTimeout(async () => {
      const results = await autocomplete(inputValue)
      // Only update if input is still focused
      if (document.activeElement === inputRef.current) {
        setDropdown({
          suggestions: results.slice(0, AUTOCOMPLETE.MAX_SUGGESTIONS),
          selectedIndex: -1,
          isVisible: results.length > 0
        })
      }
    }, AUTOCOMPLETE.DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [inputValue])

  // Look up card and open modal
  const handleSelectCard = useCallback(async (cardName: string) => {
    // Parse quantity if present (e.g., "4 Lightning Bolt")
    const match = cardName.match(/^(\d+)\s+(.+)$/)
    const parsedQuantity = match ? parseInt(match[1], 10) : 1
    const name = match ? match[2].trim() : cardName.trim()

    if (!name) return

    setIsLoading(true)
    setDropdown(initialDropdownState)

    try {
      const scryfallCard = await searchCardByName(name)
      if (!scryfallCard) {
        console.error('Card not found:', name)
        return
      }

      // Open modal with card info
      setPendingCard(scryfallCard)
      setInitialQuantity(parsedQuantity)
      setInputValue('')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Confirm adding the card from modal
  const handleConfirmAdd = useCallback(async (quantity: number, roles: string[]) => {
    if (!pendingCard) return

    const deckCard: DeckCard = {
      id: generateDeckCardId(),
      card: {
        scryfallId: pendingCard.id,
        name: pendingCard.name,
        setCode: pendingCard.set,
        collectorNumber: pendingCard.collector_number
      },
      quantity,
      inclusion: 'confirmed',
      ownership: 'owned',
      roles,
      typeLine: pendingCard.type_line,
      isPinned: false,
      addedAt: new Date().toISOString(),
      addedBy: 'user'
    }

    await addCardToDeck(deckId, deckCard)
    setPendingCard(null)
    inputRef.current?.focus()
  }, [pendingCard, deckId, addCardToDeck])

  const handleCloseModal = useCallback(() => {
    setPendingCard(null)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDropdown(prev => ({
        ...prev,
        selectedIndex: prev.selectedIndex < prev.suggestions.length - 1
          ? prev.selectedIndex + 1
          : prev.selectedIndex
      }))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDropdown(prev => ({
        ...prev,
        selectedIndex: prev.selectedIndex > 0 ? prev.selectedIndex - 1 : -1
      }))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (dropdown.selectedIndex >= 0 && dropdown.suggestions[dropdown.selectedIndex]) {
        // Preserve quantity prefix
        const quantityMatch = inputValue.match(/^(\d+)\s+/)
        const cardWithQuantity = quantityMatch
          ? `${quantityMatch[1]} ${dropdown.suggestions[dropdown.selectedIndex]}`
          : dropdown.suggestions[dropdown.selectedIndex]
        handleSelectCard(cardWithQuantity)
      } else if (inputValue.trim()) {
        handleSelectCard(inputValue)
      }
    } else if (e.key === 'Escape') {
      setDropdown(prev => ({ ...prev, isVisible: false, selectedIndex: -1 }))
      inputRef.current?.blur()
    }
  }, [dropdown.selectedIndex, dropdown.suggestions, inputValue, handleSelectCard])

  const handleSuggestionClick = useCallback((name: string) => {
    // Preserve any quantity prefix the user typed
    const quantityMatch = inputValue.match(/^(\d+)\s+/)
    const cardWithQuantity = quantityMatch ? `${quantityMatch[1]} ${name}` : name
    handleSelectCard(cardWithQuantity)
  }, [handleSelectCard, inputValue])

  const handleFocus = useCallback(() => {
    if (dropdown.suggestions.length > 0) {
      setDropdown(prev => ({ ...prev, isVisible: true }))
    }
  }, [dropdown.suggestions.length])

  const showDropdown = dropdown.isVisible && dropdown.suggestions.length > 0

  return (
    <>
      <div className="relative" ref={containerRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Add card... (e.g., Lightning Bolt or 4 Lightning Bolt)"
              value={inputValue}
              onChange={e => {
                e.stopPropagation()
                setInputValue(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={e => e.stopPropagation()}
              onFocus={handleFocus}
              disabled={isLoading}
            />

            {/* Autocomplete suggestions */}
            <div
              className={`absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto ${
                showDropdown ? '' : 'hidden'
              }`}
            >
              {dropdown.suggestions.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                    index === dropdown.selectedIndex ? 'bg-accent' : ''
                  }`}
                  onMouseDown={e => {
                    e.preventDefault()
                    handleSuggestionClick(name)
                  }}
                  onMouseEnter={() => setDropdown(prev => ({ ...prev, selectedIndex: index }))}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center px-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Type a card name and press Enter, or use format: &quot;4 Card Name&quot;
        </p>
      </div>

      {/* Add Card Modal */}
      <CardAddModal
        card={pendingCard}
        isOpen={!!pendingCard}
        onClose={handleCloseModal}
        onConfirm={handleConfirmAdd}
        format={format}
        colorIdentity={colorIdentity}
        customRoles={customRoles}
        initialQuantity={initialQuantity}
      />
    </>
  )
}
