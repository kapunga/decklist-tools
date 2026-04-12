import { useState, useRef, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { ScryfallCard } from '@/types'
import { cn } from '@/lib/utils'

interface PrintingComboboxProps {
  printings: ScryfallCard[]
  onSelect: (setCode: string, collectorNumber: string) => void
  onHover: (scryfallId: string) => void
}

const RARITY_COLORS: Record<string, string> = {
  mythic: 'text-orange-500',
  rare: 'text-yellow-500',
  uncommon: 'text-slate-400',
  common: 'text-slate-600',
}

const RARITY_SHORT: Record<string, string> = {
  mythic: 'M',
  rare: 'R',
  uncommon: 'U',
  common: 'C',
}

function formatPrintingLabel(card: ScryfallCard): string {
  return `${card.set.toUpperCase()} #${card.collector_number} — ${card.set_name ?? card.set.toUpperCase()}`
}

function matchesFilter(card: ScryfallCard, query: string): boolean {
  const q = query.toLowerCase()
  return (
    card.set.toLowerCase().includes(q) ||
    (card.set_name?.toLowerCase().includes(q) ?? false) ||
    card.collector_number.toLowerCase().includes(q)
  )
}

export function PrintingCombobox({ printings, onSelect, onHover }: PrintingComboboxProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!inputValue.trim()) return printings
    return printings.filter(p => matchesFilter(p, inputValue))
  }, [printings, inputValue])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length])

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setInputValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue('')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const card = filtered[selectedIndex]
      if (card) handleSelect(card)
    }
  }

  const handleSelect = (card: ScryfallCard) => {
    onSelect(card.set, card.collector_number)
    setInputValue('')
    setIsOpen(false)
    setSelectedIndex(0)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-1.5 border rounded-md px-2 py-1 text-sm cursor-text',
          isOpen ? 'ring-1 ring-ring' : 'hover:border-foreground/30'
        )}
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
          placeholder="Search printings..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[320px]">
          <div className="bg-popover border rounded-md shadow-lg">
            <div ref={listRef} className="max-h-64 overflow-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No printings match
                </div>
              ) : (
                filtered.map((card, index) => (
                  <button
                    key={`${card.set}-${card.collector_number}`}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2',
                      index === selectedIndex && 'bg-accent'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(card)
                    }}
                    onMouseEnter={() => {
                      setSelectedIndex(index)
                      onHover(card.id)
                    }}
                  >
                    <span className={cn('font-mono text-xs w-5', RARITY_COLORS[card.rarity])}>
                      {RARITY_SHORT[card.rarity] || card.rarity[0]?.toUpperCase()}
                    </span>
                    <span className="truncate">{formatPrintingLabel(card)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
