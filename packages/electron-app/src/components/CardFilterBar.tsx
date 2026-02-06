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
import { ManaSymbol } from '@/components/ManaCost'
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
  ownership: 'Ownership',
}

const OWNERSHIP_STATUS_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  owned: 'Owned',
  pulled: 'Pulled',
  need_to_buy: 'Buylist',
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']

interface AvailableValues {
  cmcBuckets: number[]
  colors: string[]
  cardTypes: string[]
  roleIds: string[]
  ownershipStatuses: string[]
}

function computeAvailableValues(cards: EnrichedDeckCard[]): AvailableValues {
  const cmcSet = new Set<number>()
  const colorSet = new Set<string>()
  const typeSet = new Set<string>()
  const roleSet = new Set<string>()
  const ownershipSet = new Set<string>()

  for (const { deckCard, scryfallCard } of cards) {
    const typeLine = scryfallCard?.type_line || deckCard.typeLine || ''
    const isLand = typeLine.toLowerCase().includes('land')

    if (!isLand && scryfallCard) {
      cmcSet.add(Math.min(Math.floor(scryfallCard.cmc), 7))
    }

    if (scryfallCard) {
      const colors = scryfallCard.colors || scryfallCard.color_identity
      if (colors.length === 0) {
        colorSet.add('C')
      } else {
        for (const c of colors) colorSet.add(c)
      }
    }

    const primaryType = getPrimaryType(typeLine || 'Other')
    typeSet.add(primaryType)

    for (const r of deckCard.roles) roleSet.add(r)

    ownershipSet.add(deckCard.ownership)
  }

  const cmcBuckets = [...cmcSet].sort((a, b) => a - b)
  const colors = COLOR_ORDER.filter(c => colorSet.has(c))
  const typeOrder = ['Creature', 'Planeswalker', 'Battle', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Other']
  const cardTypes = typeOrder.filter(t => typeSet.has(t))
  const roleIds = [...roleSet]
  const ownershipOrder = ['unknown', 'owned', 'pulled', 'need_to_buy']
  const ownershipStatuses = ownershipOrder.filter(s => ownershipSet.has(s))

  return { cmcBuckets, colors, cardTypes, roleIds, ownershipStatuses }
}

// Render a filter summary with inline mana pips for color/cmc filters
function FilterPillContent({
  filter,
  allRoles,
}: {
  filter: CardFilter
  allRoles: { id: string; name: string }[]
}) {
  const label = FILTER_TYPE_LABELS[filter.type]
  const mode = filter.mode === 'include' ? 'is' : 'is not'

  if (filter.values.length === 0) {
    return <span>{label}: (none selected)</span>
  }

  switch (filter.type) {
    case 'cmc': {
      const valuesStr = filter.values.map(v => v === 7 ? '7+' : String(v)).join(', ')
      return <span>{label} {mode} {valuesStr}</span>
    }
    case 'color':
      return (
        <span className="inline-flex items-center gap-1">
          {label} {mode}{' '}
          {filter.values.map((v) => (
            <ManaSymbol key={v} symbol={v} size="sm" />
          ))}
        </span>
      )
    case 'card-type':
      return <span>{label} {mode} {filter.values.join(', ')}</span>
    case 'role': {
      const names = filter.values
        .map(id => allRoles.find(r => r.id === id)?.name ?? id)
        .join(', ')
      return <span>{label} {mode} {names}</span>
    }
    case 'ownership': {
      const names = filter.values
        .map(s => OWNERSHIP_STATUS_LABELS[s] ?? s)
        .join(', ')
      return <span>{label} {mode} {names}</span>
    }
  }
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
          <FilterPillContent filter={filter} allRoles={allRoles} />
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

                {editingType === 'color' && COLOR_ORDER
                  .filter(c => available.colors.includes(c))
                  .map(c => (
                    <Button
                      key={c}
                      variant={editingValues.includes(c) ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => toggleValue(c)}
                    >
                      <ManaSymbol symbol={c} size="lg" />
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

                {editingType === 'ownership' && available.ownershipStatuses.map(s => (
                  <Button
                    key={s}
                    variant={editingValues.includes(s) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleValue(s)}
                  >
                    {OWNERSHIP_STATUS_LABELS[s]}
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
