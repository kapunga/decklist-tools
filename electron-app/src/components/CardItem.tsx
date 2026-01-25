import { Trash2, MoreVertical, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/hooks/useStore'
import type { DeckCard, CardRole, OwnershipStatus } from '@/types'

const ownershipLabels: Record<OwnershipStatus, string> = {
  owned: 'Owned',
  pulled: 'Pulled',
  need_to_buy: 'Need to Buy'
}

interface CardItemProps {
  card: DeckCard
  deckId: string
  listType: 'cards' | 'alternates' | 'sideboard'
}

export function CardItem({ card, deckId, listType }: CardItemProps) {
  const removeCardFromDeck = useStore(state => state.removeCardFromDeck)
  const updateCardInDeck = useStore(state => state.updateCardInDeck)
  const moveCard = useStore(state => state.moveCard)

  const handleRemove = async () => {
    await removeCardFromDeck(deckId, card.card.name, listType)
  }

  const handleRoleChange = async (role: CardRole) => {
    await updateCardInDeck(deckId, card.card.name, { role })
  }

  const handleOwnershipChange = async (ownership: OwnershipStatus) => {
    await updateCardInDeck(deckId, card.card.name, { ownership })
  }

  const handleMove = async (to: 'cards' | 'alternates' | 'sideboard') => {
    if (to !== listType) {
      await moveCard(deckId, card.card.name, listType, to)
    }
  }

  return (
    <div className="flex items-center justify-between p-2 bg-secondary/50 rounded hover:bg-secondary transition-colors group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium w-6 text-center">
          {card.quantity}x
        </span>
        <span className="truncate">{card.card.name}</span>
        {card.inclusion === 'considering' && (
          <Badge variant="outline" className="text-xs">?</Badge>
        )}
        {card.ownership === 'need_to_buy' && (
          <Badge variant="destructive" className="text-xs">Buy</Badge>
        )}
        {card.ownership === 'pulled' && (
          <Badge variant="secondary" className="text-xs">Pulled</Badge>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Role</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(['commander', 'core', 'enabler', 'support', 'flex', 'land'] as CardRole[]).map(role => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className="capitalize"
                  >
                    {role}
                    {card.role === role && ' ✓'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Ownership</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(['owned', 'pulled', 'need_to_buy'] as OwnershipStatus[]).map(status => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleOwnershipChange(status)}
                  >
                    {ownershipLabels[status]}
                    {card.ownership === status && ' ✓'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {listType !== 'cards' && (
                  <DropdownMenuItem onClick={() => handleMove('cards')}>
                    Mainboard
                  </DropdownMenuItem>
                )}
                {listType !== 'alternates' && (
                  <DropdownMenuItem onClick={() => handleMove('alternates')}>
                    Alternates
                  </DropdownMenuItem>
                )}
                {listType !== 'sideboard' && (
                  <DropdownMenuItem onClick={() => handleMove('sideboard')}>
                    Sideboard
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleRemove}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
