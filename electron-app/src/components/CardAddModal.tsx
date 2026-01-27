import { useState, useCallback, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CardImage } from '@/components/CardImage'
import type { ScryfallCard, DeckFormat, RoleDefinition } from '@/types'
import { getCardLimit } from '@/types'
import { getAllRoles } from '@/lib/constants'
import { isLegalInFormat, matchesColorIdentity } from '@/lib/scryfall'
import { useGlobalRoles } from '@/hooks/useStore'

interface CardAddModalProps {
  card: ScryfallCard | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (quantity: number, roles: string[]) => void
  format: DeckFormat
  colorIdentity?: string[]  // Commander's color identity for filtering
  customRoles?: RoleDefinition[]
  initialQuantity?: number
  initialRoles?: string[]
}

export function CardAddModal({
  card,
  isOpen,
  onClose,
  onConfirm,
  format,
  colorIdentity,
  customRoles = [],
  initialQuantity = 1,
  initialRoles
}: CardAddModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles || [])
  const globalRoles = useGlobalRoles()

  // Reset state when card changes
  useEffect(() => {
    if (card) {
      setQuantity(initialQuantity)
      setSelectedRoles(initialRoles || inferRolesFromCard(card))
    }
  }, [card, initialQuantity, initialRoles])

  // Calculate max quantity for this card
  const maxQuantity = card ? getCardLimit(card.name, format) : 1

  // Check legality warnings
  const legalityWarning = card ? getLegalityWarning(card, format, colorIdentity) : null

  // Get all available roles
  const allRoles = getAllRoles(globalRoles, customRoles)

  const toggleRole = useCallback((roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    )
  }, [])

  const handleConfirm = useCallback(() => {
    if (!card) return
    onConfirm(quantity, selectedRoles)
  }, [card, quantity, selectedRoles, onConfirm])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!card) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Card</DialogTitle>
          <DialogDescription>{card.name}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 py-4">
          {/* Card Image */}
          <div className="shrink-0" style={{ width: 250 }}>
            <CardImage card={card} size="normal" />
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-4">
            {/* Legality Warning */}
            {legalityWarning && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {legalityWarning}
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={maxQuantity === Infinity ? 99 : maxQuantity}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, Math.min(maxQuantity === Infinity ? 99 : maxQuantity, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(q => Math.min(maxQuantity === Infinity ? 99 : maxQuantity, q + 1))}
                  disabled={quantity >= (maxQuantity === Infinity ? 99 : maxQuantity)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                {maxQuantity !== Infinity && maxQuantity !== format.cardLimit && (
                  <span className="text-xs text-muted-foreground">
                    (max {maxQuantity})
                  </span>
                )}
              </div>
            </div>

            {/* Roles */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Roles</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-auto p-2 border rounded-md">
                {allRoles.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedRoles.includes(role.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-xs text-muted-foreground">Click to select roles</p>
              )}
            </div>

            {/* Card Info */}
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium">Type:</span> {card.type_line}</p>
              {card.mana_cost && (
                <p><span className="font-medium">Mana Cost:</span> {card.mana_cost}</p>
              )}
              <p><span className="font-medium">Set:</span> {card.set.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!!legalityWarning}>
            <Plus className="w-4 h-4 mr-2" />
            Add {quantity > 1 ? `${quantity} cards` : 'card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions

function inferRolesFromCard(_card: ScryfallCard): string[] {
  // Don't auto-assign roles - let the user choose
  return []
}

function getLegalityWarning(
  card: ScryfallCard,
  format: DeckFormat,
  colorIdentity?: string[]
): string | null {
  // Skip legality checks for kitchen_table
  if (format.type === 'kitchen_table') {
    return null
  }

  // Check format legality
  if (!isLegalInFormat(card, format.type)) {
    return `${card.name} is not legal in ${format.type}.`
  }

  // Check color identity for commander
  if (format.type === 'commander' && colorIdentity !== undefined) {
    if (!matchesColorIdentity(card, colorIdentity)) {
      const cardColors = card.color_identity.length > 0
        ? card.color_identity.join('')
        : 'Colorless'
      const deckColors = colorIdentity.length > 0
        ? colorIdentity.join('')
        : 'Colorless'
      return `Card's color identity (${cardColors}) is not within deck's color identity (${deckColors}).`
    }
  }

  return null
}
