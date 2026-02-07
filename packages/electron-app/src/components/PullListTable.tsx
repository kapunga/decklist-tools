import { PullListRow } from '@/components/PullListRow'
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

export function PullListTable({ items, deckId, focusedItemKey, onFocusItem }: PullListTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No cards to pull from this set
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="px-3 py-2 font-medium">#</th>
          <th className="px-3 py-2 font-medium">R</th>
          <th className="px-3 py-2 font-medium">Type</th>
          <th className="px-3 py-2 font-medium">Cost</th>
          <th className="px-3 py-2 font-medium">Name</th>
          <th className="px-3 py-2 font-medium text-center">Qty</th>
          <th className="px-3 py-2 font-medium text-right">Action</th>
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
