import type { Deck } from '@/types'
import { roleImportance } from '@/types'

interface DeckStatsProps {
  deck: Deck
}

export function DeckStats({ deck }: DeckStatsProps) {
  const confirmedCards = deck.cards.filter(c => c.inclusion === 'confirmed')

  // Group by role
  const byRole = confirmedCards.reduce((acc, card) => {
    acc[card.role] = (acc[card.role] || 0) + card.quantity
    return acc
  }, {} as Record<string, number>)

  // Count cards needing purchase
  const needToBuy = [
    ...deck.cards,
    ...deck.alternates,
    ...deck.sideboard
  ].filter(c => c.ownership === 'need_to_buy')

  const totalNeedToBuy = needToBuy.reduce((sum, c) => sum + c.quantity, 0)

  // Sort roles by importance
  const sortedRoles = Object.entries(byRole).sort(
    ([a], [b]) => (roleImportance[b as keyof typeof roleImportance] || 0) -
                   (roleImportance[a as keyof typeof roleImportance] || 0)
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Cards by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sortedRoles.map(([role, count]) => (
            <div
              key={role}
              className="bg-secondary rounded-lg p-4 text-center"
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {role}
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
            {needToBuy.map(card => (
              <div
                key={card.card.name}
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
