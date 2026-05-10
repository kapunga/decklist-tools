import { useState, useCallback } from 'react'
import { Bookmark, Boxes, ScanLine, Heart, Sparkles, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/hooks/useStore'
import {
  CARD_LIST_KIND,
  CARD_LIST_KIND_DEFAULT_DESCRIPTIONS,
  CARD_LIST_KIND_LABELS,
  getCardListKind,
} from '@/types'
import type { CardList, CardListKind } from '@/types'

const KIND_ICONS: Record<CardListKind, typeof Bookmark> = {
  interest: Bookmark,
  collection: Boxes,
  scan: ScanLine,
  wishlist: Heart,
  custom: Sparkles,
}

function listEntryCount(list: CardList): number {
  return list.cardSets[0]?.entries.length ?? 0
}

export function CardListsView() {
  const cardLists = useStore(state => state.cardLists)
  const selectCardList = useStore(state => state.selectCardList)

  const sorted = [...cardLists].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Lists</h1>
        <NewListDialog />
      </div>

      <div className="flex-1 overflow-auto p-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="mb-2">No lists yet.</p>
            <p className="text-sm">Create one to start collecting cards by purpose.</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(220px, 20vw, 320px), 1fr))' }}
          >
            {sorted.map(list => {
              const kind = getCardListKind(list)
              const Icon = KIND_ICONS[kind]
              return (
                <button
                  key={list.id}
                  onClick={() => selectCardList(list.id)}
                  className="text-left rounded-lg border bg-card hover:bg-accent transition-colors p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{list.name}</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wide shrink-0">
                      {CARD_LIST_KIND_LABELS[kind]}
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{list.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-auto">
                    {listEntryCount(list)} {listEntryCount(list) === 1 ? 'card' : 'cards'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function NewListDialog() {
  const createCardList = useStore(state => state.createCardList)
  const selectCardList = useStore(state => state.selectCardList)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CardListKind>(CARD_LIST_KIND.CUSTOM)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleKindChange = useCallback((next: CardListKind) => {
    setKind(next)
    if (!description || description === CARD_LIST_KIND_DEFAULT_DESCRIPTIONS[kind]) {
      setDescription(CARD_LIST_KIND_DEFAULT_DESCRIPTIONS[next])
    }
  }, [description, kind])

  const reset = () => {
    setName('')
    setKind(CARD_LIST_KIND.CUSTOM)
    setDescription('')
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      const list = await createCardList({ name: trimmed, kind, description: description.trim() || undefined })
      setOpen(false)
      reset()
      selectCardList(list.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) { setOpen(next); if (!next) reset() } }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New list
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
          <DialogDescription>Pick a kind and give it a name.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bloomburrow pool" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kind</label>
            <Select value={kind} onValueChange={(v) => handleKindChange(v as CardListKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(CARD_LIST_KIND).map(k => (
                  <SelectItem key={k} value={k}>{CARD_LIST_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description (optional)</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset() }} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
