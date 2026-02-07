import { useState } from 'react'
import { Check, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ManaCost } from '@/components/ManaCost'
import { PullQuantityModal } from '@/components/PullQuantityModal'
import { useStore } from '@/hooks/useStore'
import type { PullListItem } from '@/hooks/usePullList'
import { cn } from '@/lib/utils'

interface PullListRowProps {
  item: PullListItem
  deckId: string
}

const RARITY_COLORS: Record<string, string> = {
  mythic: 'text-orange-500',
  rare: 'text-yellow-500',
  uncommon: 'text-slate-400',
  common: 'text-slate-600',
}

const RARITY_SHORT: Record<string, string> = {
  mythic: 'M',
  rare: 'R',
  uncommon: 'U',
  common: 'C',
}

function getPrimaryType(typeLine: string): string {
  const types = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Battle']
  for (const type of types) {
    if (typeLine.includes(type)) return type
  }
  return 'Other'
}

export function PullListRow({ item, deckId }: PullListRowProps) {
  const pullCards = useStore(state => state.pullCards)
  const unpullCards = useStore(state => state.unpullCards)
  const [showModal, setShowModal] = useState(false)

  const isFullyPulled = item.quantityPulledTotal >= item.quantityNeeded
  const needsMultiple = item.quantityNeeded > 1

  const handleQuickPull = async () => {
    if (needsMultiple) {
      setShowModal(true)
    } else {
      await pullCards(deckId, item.cardName, item.setCode, item.collectorNumber, 1)
    }
  }

  const handlePull = async (quantity: number) => {
    await pullCards(deckId, item.cardName, item.setCode, item.collectorNumber, quantity)
  }

  const handleUnpull = async (quantity: number) => {
    await unpullCards(deckId, item.cardName, item.setCode, item.collectorNumber, quantity)
  }

  return (
    <>
      <tr className={cn(
        'border-b last:border-b-0 hover:bg-muted/50',
        isFullyPulled && 'opacity-50'
      )}>
        {/* Collector Number */}
        <td className="px-3 py-2 text-sm text-muted-foreground w-16">
          #{item.collectorNumber}
        </td>

        {/* Rarity */}
        <td className={cn('px-3 py-2 text-sm font-medium w-10', RARITY_COLORS[item.rarity])}>
          {RARITY_SHORT[item.rarity] || item.rarity[0]?.toUpperCase()}
        </td>

        {/* Type */}
        <td className="px-3 py-2 text-sm text-muted-foreground w-24">
          {getPrimaryType(item.typeLine)}
        </td>

        {/* Mana Cost */}
        <td className="px-3 py-2 w-28">
          <ManaCost cost={item.manaCost} size="sm" />
        </td>

        {/* Name */}
        <td className="px-3 py-2">
          <span className="font-medium">{item.cardName}</span>
        </td>

        {/* Quantity Status */}
        <td className="px-3 py-2 text-sm text-center w-20">
          <span className={cn(
            item.quantityPulledTotal >= item.quantityNeeded ? 'text-green-500' : 'text-muted-foreground'
          )}>
            {item.quantityPulledTotal}/{item.quantityNeeded}
          </span>
          {item.quantityPulledThisPrint > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              ({item.quantityPulledThisPrint})
            </span>
          )}
        </td>

        {/* Action */}
        <td className="px-3 py-2 text-right w-32">
          {isFullyPulled ? (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Pulled
            </Badge>
          ) : (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleQuickPull}
                className="h-7 text-xs"
              >
                <Package className="h-3 w-3 mr-1" />
                {needsMultiple ? `+1` : 'Pull'}
              </Button>
              {needsMultiple && item.remainingNeeded > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePull(item.remainingNeeded)}
                  className="h-7 text-xs"
                >
                  All
                </Button>
              )}
            </div>
          )}
        </td>
      </tr>

      <PullQuantityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        cardName={item.cardName}
        setCode={item.setCode}
        collectorNumber={item.collectorNumber}
        currentPulled={item.quantityPulledTotal}
        totalNeeded={item.quantityNeeded}
        onPull={handlePull}
        onUnpull={handleUnpull}
      />
    </>
  )
}
