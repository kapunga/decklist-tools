import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useStore } from '@/hooks/useStore'
import { ImportNewDeckDialog } from '@/components/ImportNewDeckDialog'
import { DeckCardPreview } from '@/components/DeckCardPreview'
import { ManaSymbol } from '@/components/ManaCost'
import { COLOR_NAMES } from '@/components/ColorPips'
import { cn } from '@/lib/utils'
import type { FormatType } from '@/types'
import { FORMAT_TYPE, getCardCount } from '@/types'
import { getDeckColorIdentity } from '@mtg-deckbuilder/shared'

const COLOR_FILTER_OPTIONS = ['W', 'U', 'B', 'R', 'G', 'C'] as const

export function DeckList() {
  const decks = useStore(state => state.decks)
  const selectDeck = useStore(state => state.selectDeck)
  const createDeck = useStore(state => state.createDeck)
  const deleteDeck = useStore(state => state.deleteDeck)

  const [showNewDeckDialog, setShowNewDeckDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckFormat, setNewDeckFormat] = useState<FormatType>(FORMAT_TYPE.COMMANDER)
  const [searchQuery, setSearchQuery] = useState('')
  const [formatFilter, setFormatFilter] = useState<FormatType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all')
  const [colorFilter, setColorFilter] = useState<Record<string, 'require' | 'exclude'>>({})
  const [colorlessOnly, setColorlessOnly] = useState(false)

  // WUBRG pips cycle off → require → exclude → off on each click.
  // C (colorless) is binary on/off and mutually exclusive with WUBRG state.
  const toggleColor = (c: string) => {
    if (c === 'C') {
      setColorlessOnly(prev => !prev)
      setColorFilter({})
      return
    }
    if (colorlessOnly) {
      setColorlessOnly(false)
      setColorFilter({ [c]: 'require' })
      return
    }
    setColorFilter(prev => {
      const current = prev[c]
      const next: Record<string, 'require' | 'exclude'> = { ...prev }
      if (current === undefined) next[c] = 'require'
      else if (current === 'require') next[c] = 'exclude'
      else delete next[c]
      return next
    })
  }

  const filteredDecks = decks.filter(d => {
    const query = searchQuery.toLowerCase()
    if (query) {
      const matchesSearch =
        d.name.toLowerCase().includes(query) ||
        d.archetype?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    if (formatFilter !== 'all' && d.format.type !== formatFilter) return false
    if (statusFilter !== 'all') {
      const isComplete = getCardCount(d) === d.format.deckSize
      if (statusFilter === 'complete' && !isComplete) return false
      if (statusFilter === 'incomplete' && isComplete) return false
    }
    if (colorlessOnly) {
      const deckColors = getDeckColorIdentity(d) ?? []
      if (deckColors.length > 0) return false
    } else {
      const deckColors = getDeckColorIdentity(d) ?? []
      for (const [color, mode] of Object.entries(colorFilter)) {
        const has = deckColors.includes(color)
        if (mode === 'require' && !has) return false
        if (mode === 'exclude' && has) return false
      }
    }
    return true
  })

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    const deck = await createDeck(newDeckName.trim(), newDeckFormat)
    setShowNewDeckDialog(false)
    setNewDeckName('')
    selectDeck(deck.id)
  }

  const handleDeleteDeck = async () => {
    if (showDeleteDialog) {
      await deleteDeck(showDeleteDialog)
      setShowDeleteDialog(null)
    }
  }

  const deckToDelete = decks.find(d => d.id === showDeleteDialog)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Decks</h1>
        <div className="flex gap-2">
          <ImportNewDeckDialog />
          <Button onClick={() => setShowNewDeckDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Deck
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search decks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={formatFilter}
          onValueChange={v => setFormatFilter(v as FormatType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value={FORMAT_TYPE.COMMANDER}>Commander</SelectItem>
            <SelectItem value={FORMAT_TYPE.STANDARD}>Standard</SelectItem>
            <SelectItem value={FORMAT_TYPE.PIONEER}>Pioneer</SelectItem>
            <SelectItem value={FORMAT_TYPE.MODERN}>Modern</SelectItem>
            <SelectItem value={FORMAT_TYPE.LEGACY}>Legacy</SelectItem>
            <SelectItem value={FORMAT_TYPE.PAUPER}>Pauper</SelectItem>
            <SelectItem value={FORMAT_TYPE.KITCHEN_TABLE}>Kitchen Table</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex" role="group" aria-label="Filter by completion status">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
            className="rounded-r-none"
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'complete' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('complete')}
            aria-pressed={statusFilter === 'complete'}
            className="rounded-none border-l-0"
          >
            Complete
          </Button>
          <Button
            variant={statusFilter === 'incomplete' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('incomplete')}
            aria-pressed={statusFilter === 'incomplete'}
            className="rounded-l-none border-l-0"
          >
            Incomplete
          </Button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Filter by color identity">
          {COLOR_FILTER_OPTIONS.map(c => {
            const isC = c === 'C'
            const mode = isC ? (colorlessOnly ? 'require' : undefined) : colorFilter[c]
            const active = mode !== undefined
            const excluded = mode === 'exclude'
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleColor(c)}
                aria-pressed={active}
                aria-label={`${COLOR_NAMES[c]}${excluded ? ' (excluded)' : mode === 'require' ? ' (required)' : ''}`}
                className={cn(
                  'relative rounded-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'opacity-100' : 'opacity-30 hover:opacity-70',
                )}
              >
                <ManaSymbol symbol={c} size="md" />
                {excluded && (
                  <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none rounded-full"
                    style={{
                      background:
                        'linear-gradient(to top right, transparent calc(50% - 1.5px), var(--destructive) calc(50% - 1.5px), var(--destructive) calc(50% + 1.5px), transparent calc(50% + 1.5px))',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {filteredDecks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {decks.length === 0 ? (
            <p>No decks yet. Create your first deck to get started!</p>
          ) : (
            <p>No decks match your filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-10 gap-y-12">
          {filteredDecks.map(deck => (
            <DeckCardPreview
              key={deck.id}
              deck={deck}
              onClick={() => selectDeck(deck.id)}
              onDelete={() => setShowDeleteDialog(deck.id)}
            />
          ))}
        </div>
      )}

      {/* New Deck Dialog */}
      <Dialog open={showNewDeckDialog} onOpenChange={setShowNewDeckDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
            <DialogDescription>
              Enter a name and select a format for your new deck.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deck Name</label>
              <Input
                placeholder="My Awesome Deck"
                value={newDeckName}
                onChange={e => setNewDeckName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select
                value={newDeckFormat}
                onValueChange={v => setNewDeckFormat(v as FormatType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FORMAT_TYPE.COMMANDER}>Commander</SelectItem>
                  <SelectItem value={FORMAT_TYPE.STANDARD}>Standard</SelectItem>
                  <SelectItem value={FORMAT_TYPE.PIONEER}>Pioneer</SelectItem>
                  <SelectItem value={FORMAT_TYPE.MODERN}>Modern</SelectItem>
                  <SelectItem value={FORMAT_TYPE.LEGACY}>Legacy</SelectItem>
                  <SelectItem value={FORMAT_TYPE.PAUPER}>Pauper</SelectItem>
                  <SelectItem value={FORMAT_TYPE.KITCHEN_TABLE}>Kitchen Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDeckDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeck} disabled={!newDeckName.trim()}>
              Create Deck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deckToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDeck}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
