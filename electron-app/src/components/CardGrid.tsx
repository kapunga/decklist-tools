import { Badge } from '@/components/ui/badge'
import { CardItem } from '@/components/CardItem'
import type { DeckCard, RoleDefinition } from '@/types'
import { getRoleColor, getAllRoles, CARD_TYPE_SORT_ORDER } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'

interface CardGridProps {
  cards: DeckCard[]
  deckId: string
  listType: 'cards' | 'alternates' | 'sideboard'
  customRoles?: RoleDefinition[]
  groupBy?: 'role' | 'type' | 'none'
}

export function CardGrid({ cards, deckId, listType, customRoles, groupBy = 'role' }: CardGridProps) {
  const globalRoles = useGlobalRoles()
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

  const allRoles = getAllRoles(globalRoles, customRoles)

  if (groupBy === 'role') {
    // Group cards by role - cards with multiple roles appear in multiple groups
    const roleGroups: Record<string, DeckCard[]> = {}
    confirmedCards.forEach(card => {
      if (card.roles.length === 0) {
        if (!roleGroups['Unassigned']) roleGroups['Unassigned'] = []
        roleGroups['Unassigned'].push(card)
      } else {
        card.roles.forEach(roleId => {
          if (!roleGroups[roleId]) roleGroups[roleId] = []
          roleGroups[roleId].push(card)
        })
      }
    })

    // Sort groups by role name
    const sortedGroups = Object.entries(roleGroups).sort(([a], [b]) => {
      // Put "Unassigned" at the end
      if (a === 'Unassigned') return 1
      if (b === 'Unassigned') return -1
      const roleA = allRoles.find(r => r.id === a)
      const roleB = allRoles.find(r => r.id === b)
      return (roleA?.name || a).localeCompare(roleB?.name || b)
    })

    return (
      <div className="p-4 space-y-6">
        {sortedGroups.map(([roleId, groupCards]) => {
          const roleDef = allRoles.find(r => r.id === roleId)
          const color = roleId === 'Unassigned' ? '#888' : getRoleColor(roleId, globalRoles, customRoles)
          const displayName = roleDef?.name || roleId

          return (
            <div key={roleId}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Badge style={{ backgroundColor: color }} className="text-white">
                  {displayName}
                </Badge>
                <span>({groupCards.reduce((sum, c) => sum + c.quantity, 0)})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {groupCards.sort((a, b) => a.card.name.localeCompare(b.card.name)).map((card, index) => (
                  <CardItem
                    key={`${roleId}-${card.card.name}-${card.card.scryfallId || index}`}
                    card={card}
                    deckId={deckId}
                    listType={listType}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (groupBy === 'type') {
    // Group by card type (land vs non-land for now since we don't have full type info)
    const typeGroups: Record<string, DeckCard[]> = { 'Nonland': [], 'Land': [] }
    confirmedCards.forEach(card => {
      if (card.roles.includes('land')) {
        typeGroups['Land'].push(card)
      } else {
        typeGroups['Nonland'].push(card)
      }
    })

    // Sort by type order
    const sortedGroups = Object.entries(typeGroups)
      .filter(([, cards]) => cards.length > 0)
      .sort(([a], [b]) => {
        const orderA = CARD_TYPE_SORT_ORDER[a] ?? 99
        const orderB = CARD_TYPE_SORT_ORDER[b] ?? 99
        return orderA - orderB
      })

    return (
      <div className="p-4 space-y-6">
        {sortedGroups.map(([typeName, groupCards]) => (
          <div key={typeName}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Badge variant="secondary">{typeName}</Badge>
              <span>({groupCards.reduce((sum, c) => sum + c.quantity, 0)})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {groupCards.sort((a, b) => a.card.name.localeCompare(b.card.name)).map((card, index) => (
                <CardItem
                  key={`${typeName}-${card.card.name}-${card.card.scryfallId || index}`}
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

  // No grouping
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
