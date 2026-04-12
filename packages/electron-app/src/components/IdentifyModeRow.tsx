import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PrintingCombobox } from '@/components/PrintingCombobox'
import { useStore } from '@/hooks/useStore'
import type { IdentifyItem } from '@/hooks/usePullList'
import type { ScryfallCard, PulledPrinting } from '@/types'
import { cn } from '@/lib/utils'

interface IdentifyModeRowProps {
  item: IdentifyItem
  printings: ScryfallCard[]
  deckId: string
  onHoverPrinting: (scryfallId: string) => void
}

function PrintingBadge({
  printing,
  onRemove,
}: {
  printing: PulledPrinting
  onRemove: () => void
}) {
  const label = `${printing.setCode.toUpperCase()} #${printing.collectorNumber}`
  const qtyLabel = printing.quantity > 1 ? ` x${printing.quantity}` : ''

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      {label}{qtyLabel}
      <button
        className="ml-0.5 hover:text-destructive transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

export function IdentifyModeRow({ item, printings, deckId, onHoverPrinting }: IdentifyModeRowProps) {
  const pullCards = useStore(state => state.pullCards)
  const unpullCards = useStore(state => state.unpullCards)

  const isFullyPulled = item.remainingNeeded <= 0

  const handleSelect = async (setCode: string, collectorNumber: string) => {
    await pullCards(deckId, item.cardName, setCode, collectorNumber, 1)
  }

  const handleRemovePrinting = async (printing: PulledPrinting) => {
    await unpullCards(deckId, item.cardName, printing.setCode, printing.collectorNumber, 1)
  }

  return (
    <tr className={cn('border-b last:border-b-0', isFullyPulled && 'opacity-60')}>
      <td className="px-3 py-2 font-medium text-sm">
        {item.cardName}
      </td>

      <td className="px-3 py-2 text-sm text-center w-20">
        <span className={cn(isFullyPulled ? 'text-green-500' : 'text-muted-foreground')}>
          {item.quantityPulledTotal}/{item.quantityNeeded}
        </span>
      </td>

      <td className="px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {item.currentPrintings.map(p => (
            <PrintingBadge
              key={`${p.setCode}-${p.collectorNumber}`}
              printing={p}
              onRemove={() => handleRemovePrinting(p)}
            />
          ))}
        </div>
      </td>

      <td className="px-3 py-2 w-80">
        {!isFullyPulled && (
          <PrintingCombobox
            printings={printings}
            onSelect={handleSelect}
            onHover={onHoverPrinting}
          />
        )}
      </td>
    </tr>
  )
}
