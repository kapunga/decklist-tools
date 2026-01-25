import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ColorPips } from '@/components/ColorPips'
import type { Deck, FormatType } from '@/types'
import { getCardCount } from '@/types'
import { getCardById, getCardArtCropUrl } from '@/lib/scryfall'

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
  const [artUrl, setArtUrl] = useState<string | null>(null)

  // Fetch art crop URL if artCardScryfallId is set
  useEffect(() => {
    if (deck.artCardScryfallId) {
      getCardById(deck.artCardScryfallId).then(card => {
        if (card) {
          const url = getCardArtCropUrl(card)
          setArtUrl(url)
        }
      })
    } else {
      setArtUrl(null)
    }
  }, [deck.artCardScryfallId])

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
      onClick={onClick}
    >
      {/* Background art */}
      {artUrl && (
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${artUrl})` }}
        />
      )}
      {/* Gradient overlay for readability */}
      {artUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      )}

      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-lg truncate">{deck.name}</CardTitle>
            {/* Color pips for commander decks or decks with color identity */}
            {deck.colorIdentity && deck.colorIdentity.length > 0 && (
              <ColorPips colors={deck.colorIdentity} size="sm" showColorless={false} />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2 shrink-0"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
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
