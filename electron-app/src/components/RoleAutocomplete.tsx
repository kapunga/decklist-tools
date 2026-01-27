import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { getAllRoles, getRoleColor } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'
import type { Deck, RoleDefinition } from '@/types'

interface RoleAutocompleteProps {
  deck: Deck
  existingRoles: string[]
  onAdd: (roleId: string) => void
  placeholder?: string
  disabled?: boolean
}

export function RoleAutocomplete({
  deck,
  existingRoles,
  onAdd,
  placeholder,
  disabled = false
}: RoleAutocompleteProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const globalRoles = useGlobalRoles()

  // Get all available roles, filtered to exclude already assigned
  const availableRoles = useMemo(() => {
    const allRoles = getAllRoles(globalRoles, deck.customRoles)
    return allRoles.filter(role => !existingRoles.includes(role.id))
  }, [globalRoles, deck.customRoles, existingRoles])

  // Filter roles by input
  const filteredRoles = useMemo(() => {
    if (!inputValue.trim()) return availableRoles
    const query = inputValue.toLowerCase()
    return availableRoles.filter(
      role => role.name.toLowerCase().includes(query) || role.id.toLowerCase().includes(query)
    )
  }, [availableRoles, inputValue])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredRoles.length])

  // Handle click outside to close dropdown
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
      setSelectedIndex(prev => Math.min(prev + 1, filteredRoles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredRoles[selectedIndex]) {
        handleSelect(filteredRoles[selectedIndex])
      }
    }
  }

  const handleSelect = (role: RoleDefinition) => {
    onAdd(role.id)
    setInputValue('')
    setIsOpen(false)
    setSelectedIndex(0)
  }

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const showPlaceholder = placeholder && existingRoles.length === 0 && !isOpen

  if (disabled) {
    return null
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {showPlaceholder ? (
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
        >
          {placeholder}
        </button>
      ) : (
        <div className="flex items-center">
          <button
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50">
          <div className="bg-popover border rounded-md shadow-lg min-w-[200px]">
            <input
              ref={inputRef}
              type="text"
              className="w-full px-2 py-1.5 text-sm bg-transparent border-b outline-none placeholder:text-muted-foreground"
              placeholder="Search roles..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              autoFocus
            />
            <div className="max-h-48 overflow-auto py-1">
              {filteredRoles.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No roles available
                </div>
              ) : (
                filteredRoles.map((role, index) => (
                  <button
                    key={role.id}
                    className={`w-full px-2 py-1.5 text-left text-sm hover:bg-accent ${
                      index === selectedIndex ? 'bg-accent' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(role)
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getRoleColor(role.id, globalRoles, deck.customRoles) }}
                      />
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground ml-4 mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
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
