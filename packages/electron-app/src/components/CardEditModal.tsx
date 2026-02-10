import { useState, useEffect, useMemo } from 'react'
import { Plus, Minus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePill } from '@/components/RolePill'
import { RoleAutocomplete } from '@/components/RoleAutocomplete'
import { useStore, useGlobalRoles, useDeckById } from '@/hooks/useStore'
import { getCardPrintings } from '@/lib/scryfall'
import type { DeckCard, ScryfallCard, OwnershipStatus } from '@/types'
import { getCardLimit } from '@/types'

interface CardEditModalProps {
  isOpen: boolean
  onClose: () => void
  card: DeckCard
  deckId: string
  listType: 'cards' | 'alternates' | 'sideboard'
}

const ownershipOptions: { value: OwnershipStatus; label: string }[] = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'owned', label: 'Owned' },
  { value: 'need_to_buy', label: 'Need to Buy' },
]

export function CardEditModal({
  isOpen,
  onClose,
  card,
  deckId,
  listType: _listType,
}: CardEditModalProps) {
  const deck = useDeckById(deckId)
  const globalRoles = useGlobalRoles()
  const updateCardInDeck = useStore(state => state.updateCardInDeck)
  const addRoleToCard = useStore(state => state.addRoleToCard)
  const removeRoleFromCard = useStore(state => state.removeRoleFromCard)

  // Local state for edits
  const [quantity, setQuantity] = useState(card.quantity)
  const [notes, setNotes] = useState(card.notes || '')
  const [ownership, setOwnership] = useState<OwnershipStatus>(card.ownership)
  const [selectedPrinting, setSelectedPrinting] = useState<ScryfallCard | null>(null)

  // Printings loading state
  const [printings, setPrintings] = useState<ScryfallCard[]>([])
  const [loadingPrintings, setLoadingPrintings] = useState(false)

  // Reset local state when card changes
  useEffect(() => {
    setQuantity(card.quantity)
    setNotes(card.notes || '')
    setOwnership(card.ownership)
    setSelectedPrinting(null)
  }, [card])

  // Load printings when modal opens
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadPrintings = async () => {
      setLoadingPrintings(true)
      try {
        const result = await getCardPrintings(card.card.name)
        if (!cancelled && result) {
          setPrintings(result.data)
          // Find current printing to mark as selected
          const current = result.data.find(
            p => p.id === card.card.scryfallId ||
                 (p.set === card.card.setCode && p.collector_number === card.card.collectorNumber)
          )
          if (current) {
            setSelectedPrinting(current)
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingPrintings(false)
        }
      }
    }

    loadPrintings()

    return () => {
      cancelled = true
    }
  }, [isOpen, card.card.name, card.card.scryfallId, card.card.setCode, card.card.collectorNumber])

  // Calculate max quantity
  const maxQty = useMemo(() => {
    if (!deck) return 99
    const limit = getCardLimit(card.card.name, deck.format)
    return limit === Infinity ? 99 : limit
  }, [deck, card.card.name])

  const handleSave = async () => {
    const updates: Partial<DeckCard> = {}

    if (quantity !== card.quantity) {
      updates.quantity = quantity
    }

    if (notes !== (card.notes || '')) {
      updates.notes = notes || undefined
    }

    if (ownership !== card.ownership) {
      updates.ownership = ownership
    }

    // Update printing if changed
    if (selectedPrinting && selectedPrinting.id !== card.card.scryfallId) {
      updates.card = {
        name: card.card.name,
        scryfallId: selectedPrinting.id,
        setCode: selectedPrinting.set,
        collectorNumber: selectedPrinting.collector_number,
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateCardInDeck(deckId, card.card.name, updates)
    }

    onClose()
  }

  const handleAddRole = async (roleId: string) => {
    await addRoleToCard(deckId, card.card.name, roleId)
  }

  const handleRemoveRole = async (roleId: string) => {
    await removeRoleFromCard(deckId, card.card.name, roleId)
  }

  if (!deck) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Card: {card.card.name}
            <span className="text-sm font-normal text-muted-foreground">
              ({card.card.setCode.toUpperCase()} #{card.card.collectorNumber})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                (max {maxQty === 99 ? 'unlimited' : maxQty})
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this card..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex items-center gap-1 flex-wrap">
              {card.roles.map(roleId => (
                <RolePill
                  key={roleId}
                  roleId={roleId}
                  globalRoles={globalRoles}
                  customRoles={deck.customRoles}
                  onRemove={() => handleRemoveRole(roleId)}
                />
              ))}
              <RoleAutocomplete
                deck={deck}
                existingRoles={card.roles}
                onAdd={handleAddRole}
                placeholder={card.roles.length === 0 ? 'Add role...' : undefined}
              />
            </div>
          </div>

          {/* Ownership */}
          <div className="space-y-2">
            <Label>Ownership Status</Label>
            <Select value={ownership} onValueChange={(v) => setOwnership(v as OwnershipStatus)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ownershipOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Printing Selector */}
          <div className="space-y-2">
            <Label>Printing</Label>
            {loadingPrintings ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading printings...</span>
              </div>
            ) : printings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No printings found</div>
            ) : (
              <Select
                value={selectedPrinting?.id || ''}
                onValueChange={(id) => {
                  const printing = printings.find(p => p.id === id)
                  if (printing) setSelectedPrinting(printing)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a printing..." />
                </SelectTrigger>
                <SelectContent>
                  {printings.map(printing => (
                    <SelectItem key={printing.id} value={printing.id}>
                      {printing.set.toUpperCase()} #{printing.collector_number}{printing.set_name ? ` — ${printing.set_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
