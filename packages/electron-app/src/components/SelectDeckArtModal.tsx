import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/hooks/useStore'
import type { Deck } from '@/types'

interface SelectDeckArtModalProps {
  isOpen: boolean
  onClose: () => void
  deck: Deck
}

export function SelectDeckArtModal({ isOpen, onClose, deck }: SelectDeckArtModalProps) {
  const setDeckArtCard = useStore(state => state.setDeckArtCard)

  const handleUseDefault = async () => {
    await setDeckArtCard(deck.id, undefined, undefined)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Set deck art for "{deck.name}"</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 pb-3 border-b">
          <Button variant="outline" size="sm" onClick={handleUseDefault}>
            Use default art
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {/* Card list — checkpoint 3 */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
