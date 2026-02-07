import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PullQuantityModalProps {
  isOpen: boolean
  onClose: () => void
  cardName: string
  setCode: string
  collectorNumber: string
  currentPulled: number
  totalNeeded: number
  onPull: (quantity: number) => void
  onUnpull: (quantity: number) => void
}

export function PullQuantityModal({
  isOpen,
  onClose,
  cardName,
  setCode,
  currentPulled,
  totalNeeded,
  onPull,
  onUnpull
}: PullQuantityModalProps) {
  const [quantity, setQuantity] = useState(1)
  const remaining = totalNeeded - currentPulled

  const handlePull = (amount: number) => {
    onPull(Math.min(amount, remaining))
    onClose()
  }

  const handleUnpull = (amount: number) => {
    onUnpull(Math.min(amount, currentPulled))
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pull Cards: {cardName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            From {setCode.toUpperCase()}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Total needed:</span>
            <span className="font-medium">{totalNeeded}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Already pulled:</span>
            <span className="font-medium">{currentPulled}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Remaining:</span>
            <span className="font-medium text-primary">{remaining}</span>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm">Custom quantity</Label>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {remaining > 0 && (
            <>
              <Button onClick={() => handlePull(1)} variant="outline">
                Pull +1
              </Button>
              {remaining > 1 && (
                <Button onClick={() => handlePull(remaining)} variant="outline">
                  Pull All ({remaining})
                </Button>
              )}
              {quantity !== 1 && quantity !== remaining && (
                <Button onClick={() => handlePull(quantity)}>
                  Pull +{quantity}
                </Button>
              )}
            </>
          )}
          {currentPulled > 0 && (
            <Button onClick={() => handleUnpull(1)} variant="destructive" size="sm">
              Unpull -1
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
