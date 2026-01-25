import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Deck, FormatType } from '@/types'
import { getCardCount } from '@/types'

const formatColors: Record<FormatType, string> = {
  commander: 'bg-purple-600',
  standard: 'bg-blue-600',
  modern: 'bg-green-600',
  kitchen_table: 'bg-orange-600'
}

const formatLabels: Record<FormatType, string> = {
  commander: 'Commander',
  standard: 'Standard',
  modern: 'Modern',
  kitchen_table: 'Kitchen Table'
}

interface DeckCardPreviewProps {
  deck: Deck
  onClick: () => void
  onDelete: () => void
}

export function DeckCardPreview({ deck, onClick, onDelete }: DeckCardPreviewProps) {
  const cardCount = getCardCount(deck)
  const formatType = deck.format.type

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg truncate">{deck.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <Badge className={formatColors[formatType]}>
            {formatLabels[formatType]}
          </Badge>
          {deck.archetype && (
            <Badge variant="outline">{deck.archetype}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {cardCount}/{deck.format.deckSize} cards
          </span>
          <span>
            {new Date(deck.updatedAt).toLocaleDateString()}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${Math.min(100, (cardCount / deck.format.deckSize) * 100)}%`
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
