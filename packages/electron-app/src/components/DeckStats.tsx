import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Deck } from '@/types'
import { getCardDisplayName } from '@/types'
import { getMainboard, getAllDeckEntries } from '@mtg-deckbuilder/shared'
import { getAllRoles } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'
import { useScryfallCache } from '@/hooks/useScryfallCache'
import { ManaCurve } from '@/components/ManaCurve'
import { ConsistencyMatrix } from '@/components/ConsistencyMatrix'
import { cn } from '@/lib/utils'

interface DeckStatsProps {
  deck: Deck
}

export function DeckStats({ deck }: DeckStatsProps) {
  const globalRoles = useGlobalRoles()
  const [matrixRoles, setMatrixRoles] = useState<string[]>([])
  const confirmedCards = useMemo(
    () => getMainboard(deck),
    [deck.cardSets]
  )
  const { cache: scryfallCache, isLoading: scryfallLoading } = useScryfallCache(confirmedCards)

  // Group by role - cards with multiple roles appear in multiple groups
  const byRole = confirmedCards.reduce<Record<string, number>>((acc, card) => {
    if (card.roles.length === 0) {
      acc['Unassigned'] = (acc['Unassigned'] || 0) + card.quantity
    } else {
      card.roles.forEach(role => {
        acc[role] = (acc[role] || 0) + card.quantity
      })
    }
    return acc
  }, {})

  // Count cards needing purchase
  const needToBuy = getAllDeckEntries(deck).filter(c => c.ownership === 'need_to_buy')

  const totalNeedToBuy = needToBuy.reduce((sum, c) => sum + c.quantity, 0)

  // Get all role definitions for display names
  const allRoles = getAllRoles(globalRoles, deck.customRoles)
  const getRoleName = (roleId: string) => {
    const role = allRoles.find(r => r.id === roleId)
    return role?.name || roleId
  }

  // Sort roles alphabetically, but put "Unassigned" at the end
  const sortedRoles = Object.entries(byRole).sort(([a], [b]) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return getRoleName(a).localeCompare(getRoleName(b))
  })

  return (
    <div className="space-y-6">
      {/* Mana Curve */}
      {scryfallLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading card data...</span>
        </div>
      ) : (
        <ManaCurve deck={deck} scryfallCache={scryfallCache} />
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Cards by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sortedRoles.map(([roleId, count]) => (
            <button
              key={roleId}
              type="button"
              className={cn(
                'bg-secondary rounded-lg p-4 text-center transition-all',
                roleId !== 'Unassigned' && 'cursor-pointer hover:bg-secondary/80',
                matrixRoles.includes(roleId) && 'ring-2 ring-primary'
              )}
              onClick={() => {
                if (roleId !== 'Unassigned') {
                  setMatrixRoles(prev =>
                    prev.includes(roleId)
                      ? prev.filter(r => r !== roleId)
                      : [...prev, roleId]
                  )
                }
              }}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground">
                {getRoleName(roleId)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <ConsistencyMatrix
        deck={deck}
        confirmedCards={confirmedCards}
        scryfallCache={scryfallCache}
        byRole={byRole}
        selectedRoles={matrixRoles}
        onToggleRole={role =>
          setMatrixRoles(prev =>
            prev.includes(role)
              ? prev.filter(r => r !== role)
              : [...prev, role]
          )
        }
      />

      {totalNeedToBuy > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Cards to Buy ({totalNeedToBuy})
          </h3>
          <div className="space-y-2">
            {needToBuy.map((card, index) => (
              <div
                key={`${card.card.name}-${card.card.scryfallId || index}`}
                className="flex items-center justify-between p-2 bg-secondary rounded"
              >
                <span>{card.quantity}x {getCardDisplayName(card.card)}</span>
                <span className="text-sm text-muted-foreground">
                  {card.card.setCode.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Deck Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>
            <span className="ml-2">
              {new Date(deck.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Updated:</span>
            <span className="ml-2">
              {new Date(deck.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Version:</span>
            <span className="ml-2">{deck.version}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Card Limit:</span>
            <span className="ml-2">
              {deck.format.cardLimit === Infinity ? 'Unlimited' : deck.format.cardLimit}
            </span>
          </div>
        </div>
      </div>

      {deck.description && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Description</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {deck.description}
          </p>
        </div>
      )}
    </div>
  )
}
