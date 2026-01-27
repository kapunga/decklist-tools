import { X, Trash2, DollarSign, Check, MoveRight, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { useStore, useGlobalRoles } from '@/hooks/useStore'
import { getAllRoles, getRoleColor } from '@/lib/constants'
import type { OwnershipStatus } from '@/types'

interface BatchOperationsToolbarProps {
  deckId: string
  selectedCount: number
  selectedCardNames: string[]
  currentListType: 'cards' | 'alternates' | 'sideboard'
  hasSideboard: boolean
}

export function BatchOperationsToolbar({
  deckId,
  selectedCount,
  selectedCardNames,
  currentListType,
  hasSideboard
}: BatchOperationsToolbarProps) {
  const clearSelection = useStore(state => state.clearSelection)
  const batchUpdateOwnership = useStore(state => state.batchUpdateOwnership)
  const batchRemoveCards = useStore(state => state.batchRemoveCards)
  const batchMoveCards = useStore(state => state.batchMoveCards)
  const batchAddRoleToCards = useStore(state => state.batchAddRoleToCards)
  const decks = useStore(state => state.decks)
  const globalRoles = useGlobalRoles()

  const deck = decks.find(d => d.id === deckId)
  const allRoles = deck ? getAllRoles(globalRoles, deck.customRoles) : []

  if (selectedCount === 0) return null

  const handleSetOwnership = async (ownership: OwnershipStatus) => {
    await batchUpdateOwnership(deckId, selectedCardNames, ownership)
  }

  const handleDelete = async () => {
    await batchRemoveCards(deckId, selectedCardNames, currentListType)
  }

  const handleMove = async (to: 'cards' | 'alternates' | 'sideboard') => {
    await batchMoveCards(deckId, selectedCardNames, currentListType, to)
  }

  const handleAddRole = async (roleId: string) => {
    await batchAddRoleToCards(deckId, selectedCardNames, roleId)
  }

  // Determine available move targets (can't move to current list)
  const moveTargets: { value: 'cards' | 'alternates' | 'sideboard'; label: string }[] = []
  if (currentListType !== 'cards') moveTargets.push({ value: 'cards', label: 'Main Deck' })
  if (currentListType !== 'alternates') moveTargets.push({ value: 'alternates', label: 'Alternates' })
  if (currentListType !== 'sideboard' && hasSideboard) moveTargets.push({ value: 'sideboard', label: 'Sideboard' })

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? 'card' : 'cards'} selected
        </span>

        <div className="h-4 w-px bg-border" />

        {/* Ownership dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <DollarSign className="w-4 h-4 mr-1" />
              Set Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Ownership Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSetOwnership('owned')}>
              <Check className="w-4 h-4 mr-2 text-green-500" />
              Owned
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetOwnership('pulled')}>
              <Check className="w-4 h-4 mr-2 text-blue-500" />
              Pulled
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetOwnership('need_to_buy')}>
              <DollarSign className="w-4 h-4 mr-2 text-yellow-500" />
              Need to Buy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Move dropdown */}
        {moveTargets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoveRight className="w-4 h-4 mr-1" />
                Move To
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {moveTargets.map(target => (
                <DropdownMenuItem key={target.value} onClick={() => handleMove(target.value)}>
                  {target.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Add Role dropdown */}
        {allRoles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="w-4 h-4 mr-1" />
                Add Role
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-auto">
              <DropdownMenuLabel>Add Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allRoles.map(role => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => handleAddRole(role.id)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: role.color || getRoleColor(role.id, globalRoles, deck?.customRoles) }}
                  />
                  {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete button */}
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Clear selection */}
        <Button variant="ghost" size="sm" onClick={clearSelection}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
