import { useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import type { CardFilter, FilterGroup, FilterMode, EnrichedDeckCard } from '@mtg-deckbuilder/shared'
import { FILTER_GROUP_TYPES } from '@mtg-deckbuilder/shared'
import { getPrimaryType } from '@mtg-deckbuilder/shared'
import type { Deck } from '@/types'
import { getAllRoles } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'

interface CardFilterBarProps {
  filters: CardFilter[]
  onChange: (filters: CardFilter[]) => void
  allowedGroups: FilterGroup[]
  deck: Deck
  enrichedCards: EnrichedDeckCard[]
}

const FILTER_TYPE_LABELS: Record<CardFilter['type'], string> = {
  cmc: 'Mana Value',
  color: 'Color',
  'card-type': 'Card Type',
  role: 'Role',
}

const COLOR_VALUES = [
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-200 text-blue-900' },
  { id: 'B', label: 'B', className: 'bg-gray-700 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-200 text-red-900' },
  { id: 'G', label: 'G', className: 'bg-green-200 text-green-900' },
  { id: 'C', label: 'C', className: 'bg-gray-200 text-gray-700' },
]

interface AvailableValues {
  cmcBuckets: number[]
  colors: string[]
  cardTypes: string[]
  roleIds: string[]
}

function computeAvailableValues(cards: EnrichedDeckCard[]): AvailableValues {
  const cmcSet = new Set<number>()
  const colorSet = new Set<string>()
  const typeSet = new Set<string>()
  const roleSet = new Set<string>()

  for (const { deckCard, scryfallCard } of cards) {
    // CMC buckets (exclude lands)
    const typeLine = scryfallCard?.type_line || deckCard.typeLine || ''
    const isLand = typeLine.toLowerCase().includes('land')

    if (!isLand && scryfallCard) {
      cmcSet.add(Math.min(Math.floor(scryfallCard.cmc), 7))
    }

    // Colors
    if (scryfallCard) {
      const colors = scryfallCard.colors || scryfallCard.color_identity
      if (colors.length === 0) {
        colorSet.add('C')
      } else {
        for (const c of colors) colorSet.add(c)
      }
    }

    // Card types
    const primaryType = getPrimaryType(typeLine || 'Other')
    typeSet.add(primaryType)

    // Roles
    for (const r of deckCard.roles) roleSet.add(r)
  }

  const cmcBuckets = [...cmcSet].sort((a, b) => a - b)
  // Keep WUBRGC order
  const colorOrder = ['W', 'U', 'B', 'R', 'G', 'C']
  const colors = colorOrder.filter(c => colorSet.has(c))
  // Keep standard type order
  const typeOrder = ['Creature', 'Planeswalker', 'Battle', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Other']
  const cardTypes = typeOrder.filter(t => typeSet.has(t))
  const roleIds = [...roleSet]

  return { cmcBuckets, colors, cardTypes, roleIds }
}

function summarizeFilter(
  filter: CardFilter,
  allRoles: { id: string; name: string }[]
): string {
  const label = FILTER_TYPE_LABELS[filter.type]
  const mode = filter.mode === 'include' ? 'is' : 'is not'

  if (filter.values.length === 0) return `${label}: (none selected)`

  let valuesStr: string
  switch (filter.type) {
    case 'cmc':
      valuesStr = filter.values.map(v => v === 7 ? '7+' : String(v)).join(', ')
      break
    case 'color':
      valuesStr = filter.values.join(', ')
      break
    case 'card-type':
      valuesStr = filter.values.join(', ')
      break
    case 'role':
      valuesStr = filter.values
        .map(id => allRoles.find(r => r.id === id)?.name ?? id)
        .join(', ')
      break
  }

  return `${label} ${mode} ${valuesStr}`
}

export function CardFilterBar({ filters, onChange, allowedGroups, deck, enrichedCards }: CardFilterBarProps) {
  const globalRoles = useGlobalRoles()
  const allRoles = getAllRoles(globalRoles, deck.customRoles)

  const available = useMemo(() => computeAvailableValues(enrichedCards), [enrichedCards])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<CardFilter['type'] | null>(null)
  const [editingMode, setEditingMode] = useState<FilterMode>('include')
  const [editingValues, setEditingValues] = useState<(string | number)[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const allowedTypes = allowedGroups.flatMap(g => FILTER_GROUP_TYPES[g])
  const availableTypes = allowedTypes.filter(t => !filters.some(f => f.type === t))

  const openNewFilter = () => {
    const defaultType = availableTypes[0] ?? allowedTypes[0]
    setEditingType(defaultType)
    setEditingMode('include')
    setEditingValues([])
    setEditingIndex(null)
    setModalOpen(true)
  }

  const openEditFilter = (index: number) => {
    const f = filters[index]
    setEditingType(f.type)
    setEditingMode(f.mode)
    setEditingValues([...f.values] as (string | number)[])
    setEditingIndex(index)
    setModalOpen(true)
  }

  const switchTab = (type: CardFilter['type']) => {
    setEditingType(type)
    setEditingValues([])
    setEditingMode('include')
  }

  const saveFilter = () => {
    if (!editingType) return
    const filter = { type: editingType, mode: editingMode, values: editingValues } as CardFilter

    if (editingIndex !== null) {
      const next = [...filters]
      if (filters[editingIndex].type !== editingType) {
        next.splice(editingIndex, 1)
        onChange([...next, filter])
      } else {
        next[editingIndex] = filter
        onChange(next)
      }
    } else {
      const existingIdx = filters.findIndex(f => f.type === editingType)
      if (existingIdx !== -1) {
        const next = [...filters]
        next[existingIdx] = filter
        onChange(next)
      } else {
        onChange([...filters, filter])
      }
    }
    setModalOpen(false)
  }

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index))
  }

  const toggleValue = (value: string | number) => {
    setEditingValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const tabTypes = allowedTypes

  if (filters.length === 0 && availableTypes.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {filters.map((filter, index) => (
        <div
          key={`${filter.type}-${index}`}
          className="flex items-center gap-1 bg-secondary rounded-full pl-3 pr-1 py-1 text-xs cursor-pointer hover:bg-secondary/80"
          onClick={() => openEditFilter(index)}
        >
          <span>{summarizeFilter(filter, allRoles)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full hover:bg-destructive/20"
            onClick={(e) => {
              e.stopPropagation()
              removeFilter(index)
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}

      {availableTypes.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 rounded-full"
          onClick={openNewFilter}
        >
          <Plus className="w-3 h-3" /> Add Filter
        </Button>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Edit' : 'Add'} Filter
            </DialogTitle>
            <DialogDescription>
              Choose a filter type and select values.
            </DialogDescription>
          </DialogHeader>

          <div className="flex border-b">
            {tabTypes.map(type => {
              const isActive = editingType === type
              const isUsed = filters.some(f => f.type === type)
              const isEditingThis = editingIndex !== null && filters[editingIndex]?.type === type
              const isDisabled = isUsed && !isEditingThis && editingIndex === null

              return (
                <button
                  key={type}
                  className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary font-medium'
                      : isDisabled
                        ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => !isDisabled && switchTab(type)}
                  disabled={isDisabled}
                >
                  {FILTER_TYPE_LABELS[type]}
                </button>
              )
            })}
          </div>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mode:</span>
              <Button
                variant={editingMode === 'include' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditingMode('include')}
              >
                Include
              </Button>
              <Button
                variant={editingMode === 'exclude' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditingMode('exclude')}
              >
                Exclude
              </Button>
            </div>

            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Values:</span>
              <div className="flex flex-wrap gap-2">
                {editingType === 'cmc' && available.cmcBuckets.map(v => (
                  <Button
                    key={v}
                    variant={editingValues.includes(v) ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleValue(v)}
                  >
                    {v === 7 ? '7+' : v}
                  </Button>
                ))}

                {editingType === 'color' && COLOR_VALUES
                  .filter(c => available.colors.includes(c.id))
                  .map(c => (
                    <Button
                      key={c.id}
                      variant={editingValues.includes(c.id) ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 w-8 p-0 ${editingValues.includes(c.id) ? c.className : ''}`}
                      onClick={() => toggleValue(c.id)}
                    >
                      {c.label}
                    </Button>
                  ))}

                {editingType === 'card-type' && available.cardTypes.map(t => (
                  <Button
                    key={t}
                    variant={editingValues.includes(t) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleValue(t)}
                  >
                    {t}
                  </Button>
                ))}

                {editingType === 'role' && allRoles
                  .filter(r => available.roleIds.includes(r.id))
                  .map(r => (
                    <Button
                      key={r.id}
                      variant={editingValues.includes(r.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleValue(r.id)}
                    >
                      {r.name}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveFilter} disabled={editingValues.length === 0}>
              {editingIndex !== null ? 'Update' : 'Add'} Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
