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
import type { FormatType } from '@/types'

export function DeckList() {
  const decks = useStore(state => state.decks)
  const selectDeck = useStore(state => state.selectDeck)
  const createDeck = useStore(state => state.createDeck)
  const deleteDeck = useStore(state => state.deleteDeck)

  const [showNewDeckDialog, setShowNewDeckDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckFormat, setNewDeckFormat] = useState<FormatType>('commander')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDecks = decks.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.archetype?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    <div className="p-6">
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

      <div className="mb-6">
        <Input
          placeholder="Search decks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredDecks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {decks.length === 0 ? (
            <p>No decks yet. Create your first deck to get started!</p>
          ) : (
            <p>No decks match your search.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  <SelectItem value="commander">Commander</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="kitchen_table">Kitchen Table</SelectItem>
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
