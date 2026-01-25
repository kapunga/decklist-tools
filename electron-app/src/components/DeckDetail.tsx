import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore, useSelectedDeck } from '@/hooks/useStore'
import { CardGrid } from '@/components/CardGrid'
import { QuickAdd } from '@/components/QuickAdd'
import { ImportDialog } from '@/components/ImportDialog'
import { DeckStats } from '@/components/DeckStats'
import { getCardCount } from '@/types'

export function DeckDetail() {
  const deck = useSelectedDeck()
  const selectDeck = useStore(state => state.selectDeck)
  const updateDeck = useStore(state => state.updateDeck)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [activeTab, setActiveTab] = useState('cards')

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  useEffect(() => {
    if (deck) {
      setEditedName(deck.name)
    }
  }, [deck?.id])

  const handleNameSave = useCallback(async () => {
    if (deck && editedName.trim() && editedName !== deck.name) {
      await updateDeck({ ...deck, name: editedName.trim() })
    }
    setIsEditingName(false)
  }, [deck, editedName, updateDeck])

  if (!deck) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a deck to view details
      </div>
    )
  }

  const cardCount = getCardCount(deck)
  const isComplete = cardCount >= deck.format.deckSize
  const hasWarnings = cardCount !== deck.format.deckSize

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => selectDeck(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {isEditingName ? (
            <Input
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleNameSave()
                if (e.key === 'Escape') {
                  setEditedName(deck.name)
                  setIsEditingName(false)
                }
              }}
              autoFocus
              className="text-xl font-bold max-w-md"
            />
          ) : (
            <h1
              className="text-xl font-bold cursor-pointer hover:text-primary"
              onClick={() => setIsEditingName(true)}
            >
              {deck.name}
            </h1>
          )}

          <Badge variant="outline" className="capitalize">
            {deck.format.type.replace('_', ' ')}
          </Badge>

          {deck.archetype && (
            <Badge variant="secondary">{deck.archetype}</Badge>
          )}

          <div className="ml-auto">
            <ImportDialog deckId={deck.id} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Card count with progress */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isComplete ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{
                  width: `${Math.min(100, (cardCount / deck.format.deckSize) * 100)}%`
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {cardCount}/{deck.format.deckSize}
            </span>
          </div>

          {/* Validation status */}
          <div className="flex items-center gap-1 text-sm">
            {isComplete ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Valid</span>
              </>
            ) : hasWarnings ? (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500">Incomplete</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <div className="border-b p-4 flex-shrink-0">
        <QuickAdd deckId={deck.id} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="cards">
              Cards ({deck.cards.filter(c => c.inclusion === 'confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="alternates">
              Alternates ({deck.alternates.length})
            </TabsTrigger>
            {deck.format.sideboardSize > 0 && (
              <TabsTrigger value="sideboard">
                Sideboard ({deck.sideboard.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="cards" className="m-0 h-full">
            <CardGrid
              cards={deck.cards}
              deckId={deck.id}
              listType="cards"
            />
          </TabsContent>

          <TabsContent value="alternates" className="m-0 h-full">
            <CardGrid
              cards={deck.alternates}
              deckId={deck.id}
              listType="alternates"
            />
          </TabsContent>

          {deck.format.sideboardSize > 0 && (
            <TabsContent value="sideboard" className="m-0 h-full">
              <CardGrid
                cards={deck.sideboard}
                deckId={deck.id}
                listType="sideboard"
              />
            </TabsContent>
          )}

          <TabsContent value="stats" className="m-0 p-4">
            <DeckStats deck={deck} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
