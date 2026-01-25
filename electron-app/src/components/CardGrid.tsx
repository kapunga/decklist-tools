import { Badge } from '@/components/ui/badge'
import { CardItem } from '@/components/CardItem'
import type { DeckCard, BuiltInCardRole, CustomRoleDefinition } from '@/types'
import { getRoleImportance, isBuiltInRole } from '@/types'

interface CardGridProps {
  cards: DeckCard[]
  deckId: string
  listType: 'cards' | 'alternates' | 'sideboard'
  customRoles?: CustomRoleDefinition[]
}

const builtInRoleColors: Record<BuiltInCardRole, string> = {
  commander: 'bg-purple-600',
  core: 'bg-blue-600',
  enabler: 'bg-green-600',
  support: 'bg-yellow-600',
  flex: 'bg-orange-600',
  land: 'bg-stone-600'
}

function getRoleColor(role: string, customRoles?: CustomRoleDefinition[]): string {
  if (isBuiltInRole(role)) {
    return builtInRoleColors[role]
  }
  const customRole = customRoles?.find(r => r.id === role)
  return customRole?.color || 'bg-gray-600'
}

export function CardGrid({ cards, deckId, listType, customRoles }: CardGridProps) {
  // Always group by role for now
  const groupBy = 'role'

  const confirmedCards = listType === 'cards'
    ? cards.filter(c => c.inclusion !== 'cut')
    : cards

  if (confirmedCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No cards in this list yet.
      </div>
    )
  }

  if (groupBy === 'role') {
    const grouped = confirmedCards.reduce((acc, card) => {
      if (!acc[card.role]) acc[card.role] = []
      acc[card.role].push(card)
      return acc
    }, {} as Record<string, DeckCard[]>)

    const sortedGroups = Object.entries(grouped).sort(
      ([a], [b]) => getRoleImportance(b, customRoles) - getRoleImportance(a, customRoles)
    )

    return (
      <div className="p-4 space-y-6">
        {sortedGroups.map(([role, groupCards]) => (
          <div key={role}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 capitalize flex items-center gap-2">
              <Badge className={getRoleColor(role, customRoles)}>{role}</Badge>
              <span>({groupCards.reduce((sum, c) => sum + c.quantity, 0)})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {groupCards.sort((a, b) => a.card.name.localeCompare(b.card.name)).map((card, index) => (
                <CardItem
                  key={`${role}-${card.card.name}-${card.card.scryfallId || index}`}
                  card={card}
                  deckId={deckId}
                  listType={listType}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {confirmedCards.sort((a, b) => a.card.name.localeCompare(b.card.name)).map((card, index) => (
          <CardItem
            key={`${card.card.name}-${card.card.scryfallId || index}`}
            card={card}
            deckId={deckId}
            listType={listType}
          />
        ))}
      </div>
    </div>
  )
}
