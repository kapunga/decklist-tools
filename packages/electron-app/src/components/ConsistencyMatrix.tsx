import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { buildConsistencyMatrix } from '@mtg-deckbuilder/shared'
import type { ConsistencyMode, DeckCard, Deck } from '@mtg-deckbuilder/shared'
import { getAllRoles } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'
import { HeatmapTable } from '@/components/HeatmapTable'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const LANDS_VIRTUAL_ROLE = '__lands__'

interface ConsistencyMatrixProps {
  deck: Deck
  confirmedCards: DeckCard[]
  byRole: Record<string, number>
  selectedRoles: string[]
  onToggleRole: (roleId: string) => void
}

function countLands(cards: DeckCard[]): number {
  return cards.reduce((sum, c) => {
    const typeLine = c.typeLine || ''
    if (typeLine.toLowerCase().includes('land')) {
      return sum + c.quantity
    }
    return sum
  }, 0)
}

export function ConsistencyMatrix({
  deck,
  confirmedCards,
  byRole,
  selectedRoles,
  onToggleRole,
}: ConsistencyMatrixProps) {
  const globalRoles = useGlobalRoles()
  const allRoles = getAllRoles(globalRoles, deck.customRoles)

  const landCount = useMemo(() => countLands(confirmedCards), [confirmedCards])

  // Resolve role names and counts
  const roleInfo = useMemo(() => {
    const info = new Map<string, { name: string; count: number }>()
    if (landCount > 0) {
      info.set(LANDS_VIRTUAL_ROLE, { name: 'Lands', count: landCount })
    }
    for (const [id, count] of Object.entries(byRole)) {
      if (id === 'Unassigned') continue
      const role = allRoles.find(r => r.id === id)
      info.set(id, { name: role?.name || id, count })
    }
    return info
  }, [byRole, allRoles, landCount])

  // Include Lands in selectedRoles tracking
  const landsSelected = selectedRoles.includes(LANDS_VIRTUAL_ROLE)

  // Compute combined count and label from all selected roles
  const { combinedCount, combinedLabel } = useMemo(() => {
    const active = selectedRoles.filter(id => roleInfo.has(id))
    const count = active.reduce((sum, id) => sum + (roleInfo.get(id)?.count ?? 0), 0)
    const label = active.map(id => roleInfo.get(id)?.name ?? id).join(' + ')
    return { combinedCount: count, combinedLabel: label }
  }, [selectedRoles, roleInfo])

  const [mode, setMode] = useState<ConsistencyMode>('at_least')
  const [expanded, setExpanded] = useState(false)

  const effectiveDeckSize = deck.format.deckSize - (deck.commanders?.length || 0)

  const defaultRange = Array.from({ length: 11 }, (_, i) => 7 + i)
  const expandedRange = Array.from({ length: 19 }, (_, i) => 7 + i)
  const cardsSeenRange = expanded ? expandedRange : defaultRange

  const matrixData = useMemo(() => {
    if (combinedCount === 0) return null
    return buildConsistencyMatrix(effectiveDeckSize, combinedCount, cardsSeenRange, mode)
  }, [effectiveDeckSize, combinedCount, cardsSeenRange, mode])

  if (roleInfo.size === 0) return null

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Consistency Matrix</h3>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Lands toggle */}
        {landCount > 0 && (
          <Button
            variant={landsSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggleRole(LANDS_VIRTUAL_ROLE)}
          >
            Lands ({landCount})
          </Button>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <Label htmlFor="consistency-mode" className="text-sm text-muted-foreground">
            {mode === 'at_least' ? 'At least' : 'Exactly'}
          </Label>
          <Switch
            id="consistency-mode"
            checked={mode === 'exact'}
            onCheckedChange={checked => setMode(checked ? 'exact' : 'at_least')}
          />
        </div>

        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Fewer Turns' : 'More Turns'}
        </Button>
      </div>

      {/* Selected role chips */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Showing:</span>
          {selectedRoles.map(id => {
            const info = roleInfo.get(id)
            if (!info) return null
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  'bg-primary text-primary-foreground hover:bg-primary/80 transition-colors'
                )}
                onClick={() => onToggleRole(id)}
              >
                {info.name} ({info.count})
                <X className="w-3 h-3" />
              </button>
            )
          })}
          {selectedRoles.length > 1 && (
            <span className="text-sm font-medium">
              = {combinedCount} cards
            </span>
          )}
        </div>
      )}

      {matrixData ? (
        <HeatmapTable data={matrixData} roleName={combinedLabel} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Click role badges above to see the consistency matrix.
        </p>
      )}
    </div>
  )
}
