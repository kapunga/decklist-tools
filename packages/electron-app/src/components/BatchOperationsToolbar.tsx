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
import { numberToWords } from '@/lib/numberToWords'
import { captionTagStyle } from '@/lib/mastheadStyles'
import type { OwnershipStatus, CardSetName } from '@/types'
import { OWNERSHIP_STATUS, CARD_SET } from '@/types'

interface BatchOperationsToolbarProps {
  deckId: string
  selectedCount: number
  selectedCardNames: string[]
  currentListType: CardSetName
  hasSideboard: boolean
}

const destructiveCaptionStyle: React.CSSProperties = {
  ...captionTagStyle,
  color: 'var(--destructive)',
}

const mutedCaptionStyle: React.CSSProperties = {
  ...captionTagStyle,
  color: 'color-mix(in srgb, var(--muted-foreground) 70%, transparent)',
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

  const handleMove = async (to: CardSetName) => {
    await batchMoveCards(deckId, selectedCardNames, currentListType, to)
  }

  const handleAddRole = async (roleId: string) => {
    await batchAddRoleToCards(deckId, selectedCardNames, roleId)
  }

  const moveTargets: { value: CardSetName; label: string }[] = []
  if (currentListType !== CARD_SET.MAINBOARD) moveTargets.push({ value: CARD_SET.MAINBOARD, label: 'Main Deck' })
  if (currentListType !== CARD_SET.ALTERNATES) moveTargets.push({ value: CARD_SET.ALTERNATES, label: 'Alternates' })
  if (currentListType !== CARD_SET.SIDEBOARD && hasSideboard) moveTargets.push({ value: CARD_SET.SIDEBOARD, label: 'Sideboard' })
  if (currentListType !== CARD_SET.CUT) moveTargets.push({ value: CARD_SET.CUT, label: 'Cut' })

  const countWord = numberToWords(selectedCount)
  const cardNoun = selectedCount === 1 ? 'card' : 'cards'

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-5 px-5 py-3"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--foreground)',
          boxShadow: '0 8px 24px -8px color-mix(in srgb, var(--foreground) 28%, transparent)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-tagline)',
            fontSize: '14px',
            fontStyle: 'italic',
            color: 'var(--foreground)',
          }}
        >
          {countWord} {cardNoun} selected
        </span>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border)' }} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={captionTagStyle}>Ownership</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Ownership Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSetOwnership(OWNERSHIP_STATUS.UNKNOWN)}>
              Unknown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetOwnership(OWNERSHIP_STATUS.OWNED)}>
              Owned
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetOwnership(OWNERSHIP_STATUS.NEED_TO_BUY)}>
              Need to Buy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {moveTargets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" style={captionTagStyle}>Move</button>
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

        {allRoles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" style={captionTagStyle}>Role</button>
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
                    className="w-2 h-2 mr-2 flex-shrink-0"
                    style={{
                      backgroundColor: role.color || getRoleColor(role.id, globalRoles, deck?.customRoles),
                      borderRadius: '50%',
                    }}
                  />
                  {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border)' }} />

        <button type="button" style={destructiveCaptionStyle} onClick={handleDelete}>
          Remove
        </button>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border)' }} />

        <button type="button" style={mutedCaptionStyle} onClick={clearSelection}>
          Clear
        </button>
      </div>
    </div>
  )
}
