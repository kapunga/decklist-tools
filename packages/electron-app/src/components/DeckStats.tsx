import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import type { Deck } from '@/types'
import { getAllRoles } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'
import { useScryfallCache } from '@/hooks/useScryfallCache'
import { ManaCurve } from '@/components/ManaCurve'

interface DeckStatsProps {
  deck: Deck
}

export function DeckStats({ deck }: DeckStatsProps) {
  const globalRoles = useGlobalRoles()
  const confirmedCards = useMemo(
    () => deck.cards.filter(c => c.inclusion === 'confirmed'),
    [deck.cards]
  )
  const { cache: scryfallCache, isLoading: scryfallLoading } = useScryfallCache(confirmedCards)

  // Group by role - cards with multiple roles appear in multiple groups
  const byRole = confirmedCards.reduce((acc, card) => {
    if (card.roles.length === 0) {
      acc['Unassigned'] = (acc['Unassigned'] || 0) + card.quantity
    } else {
      card.roles.forEach(role => {
        acc[role] = (acc[role] || 0) + card.quantity
      })
    }
    return acc
  }, {} as Record<string, number>)

  // Count cards needing purchase
  const needToBuy = [
    ...deck.cards,
    ...deck.alternates,
    ...deck.sideboard
  ].filter(c => c.ownership === 'need_to_buy')

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
            <div
              key={roleId}
              className="bg-secondary rounded-lg p-4 text-center"
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground">
                {getRoleName(roleId)}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <span>{card.quantity}x {card.card.name}</span>
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
