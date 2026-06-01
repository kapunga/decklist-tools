import { useState, useCallback } from 'react'
import { Plus, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { RolePill } from '@/components/RolePill'
import {
  captionLabelStyle,
  editorialTextStyle,
  filledActionButtonStyle,
  sectionTitleStyle,
  PAGE_X_PAD,
} from '@/lib/mastheadStyles'
import { useStore, useAllRoles } from '@/hooks/useStore'
import { migrateDeckNote, NOTE_TYPE } from '@/types'
import type { Deck, DeckNote, NoteType, NoteCardRef, RoleDefinition } from '@/types'
import { getAllDeckEntries } from '@mtg-deckbuilder/shared'

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  [NOTE_TYPE.COMBO]: 'Combo',
  [NOTE_TYPE.SYNERGY]: 'Synergy',
  [NOTE_TYPE.THEME]: 'Theme',
  [NOTE_TYPE.STRATEGY]: 'Strategy',
  [NOTE_TYPE.GENERAL]: 'General',
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
  const [formNoteType, setFormNoteType] = useState<NoteType>(NOTE_TYPE.GENERAL)
  const [formRoleId, setFormRoleId] = useState<string>('')
  const [formCardRefs, setFormCardRefs] = useState<NoteCardRef[]>([])

  const notes = deck.notes.map(n => migrateDeckNote(n))

  // All card names in deck for the picker
  const allCardNames = getAllDeckEntries(deck)
    .map(c => c.card.name)
    .filter((name, i, arr) => arr.indexOf(name) === i)
    .sort()

  const openCreateDialog = useCallback(() => {
    setFormTitle('')
    setFormContent('')
    setFormNoteType(NOTE_TYPE.GENERAL)
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
    <div
      className="overflow-auto h-full"
      style={{ paddingLeft: PAGE_X_PAD, paddingRight: PAGE_X_PAD, paddingTop: '24px', paddingBottom: '24px' }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <h2 style={sectionTitleStyle}>Notes ({notes.length})</h2>
        <button style={filledActionButtonStyle} onClick={openCreateDialog}>
          <Plus className="w-3.5 h-3.5" />
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div
          className="flex items-center justify-center h-32"
          style={{
            fontFamily: 'var(--font-tagline)',
            fontStyle: 'italic',
            fontSize: '16px',
            color: 'var(--muted-foreground)',
          }}
        >
          no notes yet — add notes to document combos, synergies, and strategy
        </div>
      ) : (
        <div>
          {notes.map(note => (
            <div
              key={note.id}
              style={{
                padding: '16px 4px',
                borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span style={captionLabelStyle}>{NOTE_TYPE_LABELS[note.noteType]}</span>
                    {note.roleId && (
                      <RolePill roleId={note.roleId} customRoles={allRoles} />
                    )}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '17px',
                      fontStyle: 'italic',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      letterSpacing: '-0.01em',
                      marginTop: '4px',
                    }}
                  >
                    {note.title}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    className="hover:opacity-80 transition-opacity"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      color: 'var(--muted-foreground)',
                    }}
                    onClick={() => openEditDialog(note)}
                    title="Edit note"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    className="hover:opacity-80 transition-opacity"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--destructive)',
                      lineHeight: 1,
                    }}
                    onClick={() => setDeleteConfirm({ noteId: note.id, hasRole: !!note.roleId })}
                    title="Delete note"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex gap-6" style={{ marginTop: '8px' }}>
                <div className="flex-1 min-w-0">
                  <p className="whitespace-pre-wrap" style={editorialTextStyle}>{note.content}</p>
                </div>
                {note.cardRefs.length > 0 && (
                  <div className="shrink-0 pl-4" style={{ borderLeft: '1px solid var(--border)' }}>
                    <span style={captionLabelStyle}>Cards</span>
                    <ol style={{ marginTop: '6px' }}>
                      {note.cardRefs.map(ref => (
                        <li key={ref.cardName} style={{ ...editorialTextStyle, lineHeight: '22px' }}>
                          <span style={{ color: 'var(--muted-foreground)', marginRight: '6px' }}>{ref.ordinal}.</span>
                          {ref.cardName}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ))}
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
