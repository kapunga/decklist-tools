import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CollectionLevel, SetCollectionEntry } from '@/types'
import { getAllSets, type ScryfallSet } from '@/lib/scryfall'

// Set type priority for sorting (lower = more useful, shown first)
const SET_TYPE_PRIORITY: Record<string, number> = {
  expansion: 0,
  core: 0,
  draft_innovation: 1,
  masters: 2,
  commander: 3,
  funny: 4,
  starter: 5,
  box: 5,
  spellbook: 5,
  arsenal: 5,
  duel_deck: 5,
  from_the_vault: 5,
  premium_deck: 5,
  planechase: 6,
  archenemy: 6,
  masterpiece: 6,
  promo: 7,
  token: 7,
  memorabilia: 7,
  alchemy: 7,
  treasure_chest: 7,
  minigame: 7,
}

function getSetTypePriority(setType: string): number {
  return SET_TYPE_PRIORITY[setType] ?? 6
}

interface SetCollectionQuickAddProps {
  onAdd: (entry: Omit<SetCollectionEntry, 'addedAt'>) => Promise<void>
  existingSetCodes: string[]
}

interface DropdownState {
  suggestions: ScryfallSet[]
  selectedIndex: number
  isVisible: boolean
}

const initialDropdownState: DropdownState = {
  suggestions: [],
  selectedIndex: -1,
  isVisible: false
}

export function SetCollectionQuickAdd({ onAdd, existingSetCodes }: SetCollectionQuickAddProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedSet, setSelectedSet] = useState<ScryfallSet | null>(null)
  const [collectionLevel, setCollectionLevel] = useState<CollectionLevel>(2)
  const [dropdown, setDropdown] = useState<DropdownState>(initialDropdownState)
  const [allSets, setAllSets] = useState<ScryfallSet[]>([])
  const [isLoadingSets, setIsLoadingSets] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load all sets on mount
  useEffect(() => {
    if (allSets.length === 0) {
      setIsLoadingSets(true)
      getAllSets()
        .then(sets => {
          const sorted = [...sets].sort((a, b) => {
            const priorityA = getSetTypePriority(a.set_type)
            const priorityB = getSetTypePriority(b.set_type)
            if (priorityA !== priorityB) return priorityA - priorityB
            if (!a.released_at) return 1
            if (!b.released_at) return -1
            return b.released_at.localeCompare(a.released_at)
          })
          setAllSets(sorted)
        })
        .catch(err => {
          console.error('Failed to load sets:', err)
        })
        .finally(() => setIsLoadingSets(false))
    }
  }, [allSets.length])

  // Filter sets based on input
  const filteredSets = useMemo(() => {
    if (!inputValue.trim()) return []

    const query = inputValue.toLowerCase()
    const existingCodesLower = existingSetCodes.map(c => c.toLowerCase())

    return allSets
      .filter(set => {
        if (existingCodesLower.includes(set.code.toLowerCase())) return false
        return set.name.toLowerCase().includes(query) ||
               set.code.toLowerCase().includes(query)
      })
      .slice(0, 8)
  }, [inputValue, allSets, existingSetCodes])

  // Update dropdown when filtered sets change
  useEffect(() => {
    if (filteredSets.length > 0 && inputValue.trim() && !selectedSet) {
      setDropdown({
        suggestions: filteredSets,
        selectedIndex: -1,
        isVisible: true
      })
    } else {
      setDropdown(prev => ({ ...prev, isVisible: false }))
    }
  }, [filteredSets, inputValue, selectedSet])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdown(prev => ({ ...prev, isVisible: false }))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetForm = useCallback(() => {
    setInputValue('')
    setSelectedSet(null)
    setCollectionLevel(2)
    setDropdown(initialDropdownState)
    setError(null)
  }, [])

  const handleSelectSet = useCallback((set: ScryfallSet) => {
    setSelectedSet(set)
    setInputValue(set.name)
    setDropdown(initialDropdownState)
    setError(null)
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    if (selectedSet && value !== selectedSet.name) {
      setSelectedSet(null)
    }
    setError(null)
  }, [selectedSet])

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
        handleSelectSet(dropdown.suggestions[dropdown.selectedIndex])
      } else if (selectedSet) {
        handleAdd()
      }
    } else if (e.key === 'Escape') {
      setDropdown(prev => ({ ...prev, isVisible: false, selectedIndex: -1 }))
      inputRef.current?.blur()
    }
  }, [dropdown.selectedIndex, dropdown.suggestions, handleSelectSet, selectedSet])

  const handleFocus = useCallback(() => {
    if (filteredSets.length > 0 && !selectedSet) {
      setDropdown(prev => ({ ...prev, isVisible: true }))
    }
  }, [filteredSets.length, selectedSet])

  const handleAdd = useCallback(async () => {
    if (!selectedSet) {
      setError('Select a set first')
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      await onAdd({
        setCode: selectedSet.code.toLowerCase(),
        setName: selectedSet.name,
        collectionLevel,
        releasedAt: selectedSet.released_at
      })
      resetForm()
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setIsAdding(false)
    }
  }, [selectedSet, collectionLevel, onAdd, resetForm])

  const showDropdown = dropdown.isVisible && dropdown.suggestions.length > 0

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Autocomplete input */}
        <div className="relative flex-1" ref={containerRef}>
          <Input
            ref={inputRef}
            placeholder={isLoadingSets ? 'Loading sets...' : 'Search for a set...'}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            disabled={isLoadingSets || isAdding}
            className={selectedSet ? 'border-green-500' : ''}
          />

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
              {dropdown.suggestions.map((set, index) => (
                <button
                  key={set.code}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                    index === dropdown.selectedIndex ? 'bg-accent' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectSet(set)
                  }}
                  onMouseEnter={() => setDropdown(prev => ({ ...prev, selectedIndex: index }))}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{set.name}</span>
                    <span className="text-muted-foreground uppercase text-xs">{set.code}</span>
                  </div>
                  {set.released_at && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(set.released_at).getFullYear()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Level select */}
        <Select
          value={String(collectionLevel)}
          onValueChange={(value) => setCollectionLevel(Number(value) as CollectionLevel)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {([1, 2, 3, 4] as CollectionLevel[]).map((level) => (
              <SelectItem key={level} value={String(level)}>
                Level {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Add button */}
        <Button
          onClick={handleAdd}
          disabled={!selectedSet || isAdding}
          size="icon"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
