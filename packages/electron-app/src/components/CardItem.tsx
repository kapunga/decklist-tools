import { useState } from 'react'
import { Trash2, MoreVertical, ArrowRight, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useStore, useAllRoles, useGlobalRoles } from '@/hooks/useStore'
import { getRoleColor } from '@/lib/constants'
import { CardEditModal } from '@/components/CardEditModal'
import type { DeckCard, OwnershipStatus, RoleDefinition } from '@/types'

const ownershipLabels: Record<OwnershipStatus, string> = {
  unknown: 'Unknown',
  owned: 'Owned',
  pulled: 'Pulled',
  need_to_buy: 'Need to Buy'
}

interface RolePillProps {
  roleId: string
  roleDefinition?: RoleDefinition
  globalRoles?: RoleDefinition[]
  onRemove?: () => void
}

function RolePill({ roleId, roleDefinition, globalRoles, onRemove }: RolePillProps) {
  const color = getRoleColor(roleId, globalRoles, roleDefinition ? [roleDefinition] : undefined)
  const name = roleDefinition?.name || roleId

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-white"
            style={{ backgroundColor: color }}
          >
            {name}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="hover:bg-black/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        </TooltipTrigger>
        {roleDefinition?.description && (
          <TooltipContent>
            <p>{roleDefinition.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
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
  const addRoleToCard = useStore(state => state.addRoleToCard)
  const removeRoleFromCard = useStore(state => state.removeRoleFromCard)
  const allRoles = useAllRoles(deckId)
  const globalRoles = useGlobalRoles()

  const handleRemove = async () => {
    await removeCardFromDeck(deckId, card.card.name, listType)
  }

  const handleOwnershipChange = async (ownership: OwnershipStatus) => {
    await updateCardInDeck(deckId, card.card.name, { ownership })
  }

  const handleMove = async (to: 'cards' | 'alternates' | 'sideboard') => {
    if (to !== listType) {
      await moveCard(deckId, card.card.name, listType, to)
    }
  }

  const handleAddRole = async (roleId: string) => {
    await addRoleToCard(deckId, card.card.name, roleId)
  }

  const handleRemoveRole = async (roleId: string) => {
    await removeRoleFromCard(deckId, card.card.name, roleId)
  }

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(card.notes || '')

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleSaveNotes = async () => {
    if (notesValue !== (card.notes || '')) {
      await updateCardInDeck(deckId, card.card.name, { notes: notesValue || undefined })
    }
    setIsEditingNotes(false)
  }

  // Get available roles that aren't already assigned
  const availableRoles = allRoles.filter(r => !card.roles.includes(r.id))

  return (
    <div className="flex items-center justify-between p-2 bg-secondary/50 rounded hover:bg-secondary transition-colors group">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-medium w-6 text-center flex-shrink-0">
          {card.quantity}x
        </span>
        <span className="truncate">{card.card.name}</span>

        {/* Role pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {card.roles.map(roleId => {
            const roleDef = allRoles.find(r => r.id === roleId)
            return (
              <RolePill
                key={roleId}
                roleId={roleId}
                roleDefinition={roleDef}
                globalRoles={globalRoles}
                onRemove={() => handleRemoveRole(roleId)}
              />
            )
          })}
        </div>

        {/* Notes - inline editable */}
        {isEditingNotes ? (
          <Input
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveNotes()
              if (e.key === 'Escape') {
                setNotesValue(card.notes || '')
                setIsEditingNotes(false)
              }
            }}
            placeholder="Add notes..."
            autoFocus
            className="text-xs text-muted-foreground max-w-xs h-6"
          />
        ) : (
          <button
            onClick={() => setIsEditingNotes(true)}
            className="text-xs text-muted-foreground hover:text-foreground line-clamp-2 text-left max-w-xs"
          >
            {card.notes || <span className="italic opacity-50">Add notes...</span>}
          </button>
        )}

        {card.inclusion === 'considering' && (
          <Badge variant="outline" className="text-xs flex-shrink-0">?</Badge>
        )}
        {card.ownership === 'need_to_buy' && (
          <Badge variant="destructive" className="text-xs flex-shrink-0">Buy</Badge>
        )}
        {card.ownership === 'pulled' && (
          <Badge variant="secondary" className="text-xs flex-shrink-0">Pulled</Badge>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableRoles.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Add Role</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-64 overflow-auto">
                  {availableRoles.map(role => (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={() => handleAddRole(role.id)}
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: role.color || '#888' }}
                      />
                      {role.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Ownership</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(['unknown', 'owned', 'pulled', 'need_to_buy'] as OwnershipStatus[]).map(status => (
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

            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Card
            </DropdownMenuItem>

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

      {/* Edit Card Modal */}
      <CardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        card={card}
        deckId={deckId}
        listType={listType}
      />
    </div>
  )
}
