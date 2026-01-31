import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CreateRoleDialog } from '@/components/CreateRoleDialog'
import { useStore, useAllRoles } from '@/hooks/useStore'
import { migrateDeckNote } from '@/types'
import type { Deck, DeckNote, NoteType, NoteCardRef, RoleDefinition } from '@/types'

const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  combo: 'bg-red-500/20 text-red-400 border-red-500/30',
  synergy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  theme: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  strategy: 'bg-green-500/20 text-green-400 border-green-500/30',
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  combo: 'Combo',
  synergy: 'Synergy',
  theme: 'Theme',
  strategy: 'Strategy',
  general: 'General',
}

interface NotesViewProps {
  deck: Deck
}

export function NotesView({ deck }: NotesViewProps) {
  const addNote = useStore(state => state.addNote)
  const updateNote = useStore(state => state.updateNote)
  const deleteNote = useStore(state => state.deleteNote)
  const addCustomRole = useStore(state => state.addCustomRole)
  const allRoles = useAllRoles(deck.id)

  const [editingNote, setEditingNote] = useState<DeckNote | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ noteId: string; hasRole: boolean } | null>(null)
  const [showCreateRole, setShowCreateRole] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formNoteType, setFormNoteType] = useState<NoteType>('general')
  const [formRoleId, setFormRoleId] = useState<string>('')
  const [formCardRefs, setFormCardRefs] = useState<NoteCardRef[]>([])

  const notes = deck.notes.map(n => migrateDeckNote(n))

  // All card names in deck for the picker
  const allCardNames = [
    ...deck.cards.map(c => c.card.name),
    ...deck.alternates.map(c => c.card.name),
    ...deck.sideboard.map(c => c.card.name),
  ].filter((name, i, arr) => arr.indexOf(name) === i).sort()

  const openCreateDialog = useCallback(() => {
    setFormTitle('')
    setFormContent('')
    setFormNoteType('general')
    setFormRoleId('')
    setFormCardRefs([])
    setIsCreateMode(true)
    setEditingNote({} as DeckNote) // triggers dialog open
  }, [])

  const openEditDialog = useCallback((note: DeckNote) => {
    setFormTitle(note.title)
    setFormContent(note.content)
    setFormNoteType(note.noteType)
    setFormRoleId(note.roleId || '')
    setFormCardRefs([...note.cardRefs])
    setIsCreateMode(false)
    setEditingNote(note)
  }, [])

  const closeDialog = useCallback(() => {
    setEditingNote(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formTitle.trim()) return

    if (isCreateMode) {
      await addNote(deck.id, {
        title: formTitle.trim(),
        content: formContent,
        noteType: formNoteType,
        cardRefs: formCardRefs,
        roleId: formRoleId || undefined,
      })
    } else if (editingNote) {
      await updateNote(deck.id, editingNote.id, {
        title: formTitle.trim(),
        content: formContent,
        noteType: formNoteType,
        cardRefs: formCardRefs,
        roleId: formRoleId || undefined,
      })
    }
    closeDialog()
  }, [isCreateMode, formTitle, formContent, formNoteType, formCardRefs, formRoleId, deck.id, editingNote, addNote, updateNote, closeDialog])

  const handleDelete = useCallback(async (noteId: string, removeRole: boolean) => {
    await deleteNote(deck.id, noteId, removeRole)
    setDeleteConfirm(null)
  }, [deck.id, deleteNote])

  const handleRoleCreated = useCallback(async (role: RoleDefinition) => {
    await addCustomRole(deck.id, role)
    setFormRoleId(role.id)
  }, [deck.id, addCustomRole])

  const toggleCardRef = useCallback((cardName: string) => {
    setFormCardRefs(prev => {
      const exists = prev.find(r => r.cardName === cardName)
      if (exists) {
        // Remove and re-number
        const filtered = prev.filter(r => r.cardName !== cardName)
        return filtered.map((r, i) => ({ ...r, ordinal: i + 1 }))
      } else {
        return [...prev, { cardName, ordinal: prev.length + 1 }]
      }
    })
  }, [])

  const moveCardRef = useCallback((index: number, direction: 'up' | 'down') => {
    setFormCardRefs(prev => {
      const arr = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= arr.length) return prev
      ;[arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]]
      return arr.map((r, i) => ({ ...r, ordinal: i + 1 }))
    })
  }, [])

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notes ({notes.length})</h2>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-1" />
          Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No notes yet. Add notes to document combos, synergies, and strategy.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => {
            const role = note.roleId ? allRoles.find(r => r.id === note.roleId) : null
            return (
              <Card key={note.id}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className={`text-xs shrink-0 ${NOTE_TYPE_COLORS[note.noteType]}`}>
                        {NOTE_TYPE_LABELS[note.noteType]}
                      </Badge>
                      <CardTitle className="text-base truncate">{note.title}</CardTitle>
                      {role && (
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0"
                          style={role.color ? { borderColor: role.color, color: role.color } : undefined}
                        >
                          {role.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(note)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteConfirm({ noteId: note.id, hasRole: !!note.roleId })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                    {note.cardRefs.length > 0 && (
                      <div className="shrink-0 border-l pl-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Cards</p>
                        <ol className="text-sm space-y-0.5">
                          {note.cardRefs.map(ref => (
                            <li key={ref.cardName} className="text-muted-foreground">
                              <span className="text-xs text-muted-foreground/60 mr-1">{ref.ordinal}.</span>
                              {ref.cardName}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editingNote !== null} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? 'Add Note' : 'Edit Note'}</DialogTitle>
            <DialogDescription>
              Document combos, synergies, and strategy for this deck.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Note title" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={formNoteType} onValueChange={v => setFormNoteType(v as NoteType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map(type => (
                    <SelectItem key={type} value={type}>{NOTE_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="Describe the interaction, combo, or strategy..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Role (optional)</label>
              <div className="flex gap-2">
                <Select value={formRoleId || '_none'} onValueChange={v => setFormRoleId(v === '_none' ? '' : v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="No role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No role</SelectItem>
                    {allRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowCreateRole(true)} title="Create new role">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formRoleId && (
                <p className="text-xs text-muted-foreground mt-1">
                  This role will be added to all associated cards.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Associated Cards</label>

              {/* Selected cards with reordering */}
              {formCardRefs.length > 0 && (
                <div className="mb-2 space-y-1">
                  {formCardRefs.map((ref, index) => (
                    <div key={ref.cardName} className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2 py-1">
                      <span className="text-xs text-muted-foreground w-4">{ref.ordinal}.</span>
                      <span className="flex-1">{ref.cardName}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === 0} onClick={() => moveCardRef(index, 'up')}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === formCardRefs.length - 1} onClick={() => moveCardRef(index, 'down')}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleCardRef(ref.cardName)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Card picker */}
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {allCardNames
                  .filter(name => !formCardRefs.some(r => r.cardName === name))
                  .map(name => (
                    <div
                      key={name}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5"
                      onClick={() => toggleCardRef(name)}
                    >
                      <Checkbox checked={false} />
                      <span>{name}</span>
                    </div>
                  ))}
                {allCardNames.length === 0 && (
                  <p className="text-xs text-muted-foreground">No cards in deck</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim()}>
              {isCreateMode ? 'Add Note' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={showCreateRole}
        onOpenChange={setShowCreateRole}
        onCreated={handleRoleCreated}
        title="Create Custom Role"
        description="Create a new deck-specific role and assign it to this note."
      />

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note?
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm?.hasRole && (
            <p className="text-sm text-muted-foreground">
              This note has an associated role. Would you also like to remove the role from the associated cards?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            {deleteConfirm?.hasRole && (
              <Button variant="outline" onClick={() => handleDelete(deleteConfirm.noteId, true)}>
                Delete & Remove Role
              </Button>
            )}
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm.noteId, false)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
