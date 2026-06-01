import { PullListRow } from '@/components/PullListRow'
import { captionLabelStyle, editorialTextStyle } from '@/lib/mastheadStyles'
import type { PullListItem } from '@/hooks/usePullList'

interface PullListTableProps {
  items: PullListItem[]
  deckId: string
  focusedItemKey: string | null
  onFocusItem: (item: PullListItem) => void
}

// Helper to create a unique key for a pull list item
function getItemKey(item: PullListItem): string {
  return `${item.deckCardId}-${item.setCode}-${item.collectorNumber}`
}

// Column headers in the caption register, sized to match PullListRow's cells.
const headerCellStyle = { ...captionLabelStyle, fontSize: '10px', padding: '6px 12px' } as const

export function PullListTable({ items, deckId, focusedItemKey, onFocusItem }: PullListTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center" style={{ ...editorialTextStyle, color: 'var(--muted-foreground)', padding: '16px 0' }}>
        no cards to pull from this set
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
          <th style={headerCellStyle}>#</th>
          <th style={headerCellStyle}>R</th>
          <th style={headerCellStyle}>Type</th>
          <th style={headerCellStyle}>Cost</th>
          <th style={headerCellStyle}>Name</th>
          <th style={{ ...headerCellStyle, textAlign: 'center' }}>Qty</th>
          <th style={{ ...headerCellStyle, textAlign: 'right' }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const itemKey = getItemKey(item)
          return (
            <PullListRow
              key={itemKey}
              item={item}
              deckId={deckId}
              isFocused={focusedItemKey === itemKey}
              onFocus={() => onFocusItem(item)}
            />
          )
        })}
      </tbody>
    </table>
  )
}
