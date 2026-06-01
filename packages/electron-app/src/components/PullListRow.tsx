import { useState } from 'react'
import { Check, Package } from 'lucide-react'
import { ManaCost } from '@/components/ManaCost'
import { PullQuantityModal } from '@/components/PullQuantityModal'
import { useStore } from '@/hooks/useStore'
import { captionTagStyle, captionLabelStyle, editorialTextStyle } from '@/lib/mastheadStyles'
import type { CSSProperties } from 'react'
import type { PullListItem } from '@/hooks/usePullList'

interface PullListRowProps {
  item: PullListItem
  deckId: string
  isFocused: boolean
  onFocus: () => void
}

// Rarity reads via theme tokens, not hardcoded Tailwind: mythic/rare share the
// metal token (--color-m, each theme's gold/bronze) with mythic at full weight;
// uncommon/common step down through foreground → muted so the column stays
// rank-ordered and legible on any ground.
const RARITY_COLORS: Record<string, string> = {
  mythic: 'var(--color-m)',
  rare: 'color-mix(in srgb, var(--color-m) 70%, var(--muted-foreground))',
  uncommon: 'var(--muted-foreground)',
  common: 'color-mix(in srgb, var(--muted-foreground) 65%, transparent)',
}

const RARITY_SHORT: Record<string, string> = {
  mythic: 'M',
  rare: 'R',
  uncommon: 'U',
  common: 'C',
}

const bodyCellStyle: CSSProperties = { padding: '8px 12px' }

function getPrimaryType(typeLine: string): string {
  const types = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Battle']
  for (const type of types) {
    if (typeLine.includes(type)) return type
  }
  return 'Other'
}

export function PullListRow({ item, deckId, isFocused, onFocus }: PullListRowProps) {
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
      <tr
        className="cursor-pointer transition-colors"
        onClick={onFocus}
        style={{
          borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
          backgroundColor: isFocused
            ? 'color-mix(in srgb, var(--foreground) 8%, transparent)'
            : 'transparent',
          opacity: isFullyPulled ? 0.5 : 1,
        }}
      >
        {/* Collector Number */}
        <td style={{ ...bodyCellStyle, ...editorialTextStyle, color: 'var(--muted-foreground)', width: '64px' }}>
          #{item.collectorNumber}
        </td>

        {/* Rarity */}
        <td style={{ ...bodyCellStyle, ...captionLabelStyle, color: RARITY_COLORS[item.rarity] ?? 'var(--muted-foreground)', width: '40px' }}>
          {RARITY_SHORT[item.rarity] || item.rarity[0]?.toUpperCase()}
        </td>

        {/* Type */}
        <td style={{ ...bodyCellStyle, ...editorialTextStyle, color: 'var(--muted-foreground)', width: '96px' }}>
          {getPrimaryType(item.typeLine)}
        </td>

        {/* Mana Cost */}
        <td style={{ ...bodyCellStyle, width: '112px' }}>
          <ManaCost cost={item.manaCost} size="sm" />
        </td>

        {/* Name */}
        <td style={bodyCellStyle}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
            {item.cardName}
          </span>
        </td>

        {/* Quantity Status */}
        <td style={{ ...bodyCellStyle, ...editorialTextStyle, textAlign: 'center', width: '80px' }}>
          <span style={{ color: isFullyPulled ? 'var(--color-g)' : 'var(--muted-foreground)' }}>
            {item.quantityPulledTotal}/{item.quantityNeeded}
          </span>
          {item.quantityPulledThisPrint > 0 && (
            <span style={{ color: 'var(--muted-foreground)' }}> ({item.quantityPulledThisPrint})</span>
          )}
        </td>

        {/* Action */}
        <td style={{ ...bodyCellStyle, textAlign: 'right', width: '128px' }}>
          {isFullyPulled ? (
            <span style={{ ...captionLabelStyle, display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-g)' }}>
              <Check className="w-3 h-3" />
              Pulled
            </span>
          ) : (
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleQuickPull}
                className="hover:opacity-80 transition-opacity"
                style={{ ...captionTagStyle, color: 'var(--foreground)' }}
              >
                <Package className="w-3 h-3" />
                {needsMultiple ? '+1' : 'Pull'}
              </button>
              {needsMultiple && item.remainingNeeded > 1 && (
                <button
                  type="button"
                  onClick={() => handlePull(item.remainingNeeded)}
                  className="hover:opacity-80 transition-opacity"
                  style={captionTagStyle}
                >
                  All
                </button>
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
