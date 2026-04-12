import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { IdentifyModeRow } from '@/components/IdentifyModeRow'
import type { IdentifyItem } from '@/hooks/usePullList'
import type { ScryfallCard } from '@/types'

interface IdentifyModeListProps {
  items: IdentifyItem[]
  printingsMap: Map<string, ScryfallCard[]>
  deckId: string
  onHoverPrinting: (scryfallId: string) => void
}

export function IdentifyModeList({ items, printingsMap, deckId, onHoverPrinting }: IdentifyModeListProps) {
  const identifiedCount = useMemo(() => items.filter(i => i.remainingNeeded <= 0).length, [items])
  const totalCount = items.length
  const allDone = identifiedCount === totalCount

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Identify Printings</h2>
          <Badge variant={allDone ? 'default' : 'secondary'}>
            {identifiedCount}/{totalCount} identified
          </Badge>
        </div>
      </div>

      {allDone ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Check className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium text-green-500">All printings identified!</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left text-sm font-medium">Name</th>
                <th className="px-3 py-2 text-center text-sm font-medium w-20">Qty</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Identified As</th>
                <th className="px-3 py-2 text-left text-sm font-medium w-80">Select Printing</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <IdentifyModeRow
                  key={item.deckCardId}
                  item={item}
                  printings={printingsMap.get(item.cardName.toLowerCase()) || []}
                  deckId={deckId}
                  onHoverPrinting={onHoverPrinting}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
