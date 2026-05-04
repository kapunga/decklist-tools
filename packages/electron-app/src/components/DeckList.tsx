import { useState, useEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { numberToWords } from '@/lib/numberToWords'
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

const THEME_TAGLINES: Record<string, string> = {
  library: 'library',
  fantasy: 'codex',
  steampunk: 'workshop',
  ukiyoe: 'studio',
  cyberpunk: 'grid',
  gothic: 'crypt',
}

function libraryTagline(theme: string | undefined, count: number): string {
  const noun = (theme && THEME_TAGLINES[theme]) || 'library'
  if (count === 0) return `the ${noun} is empty`
  return `${numberToWords(count)} in the ${noun}`
}

export function DeckList() {
  const decks = useStore(state => state.decks)
  const selectDeck = useStore(state => state.selectDeck)
  const createDeck = useStore(state => state.createDeck)
  const deleteDeck = useStore(state => state.deleteDeck)
  const newDeckToken = useStore(state => state.newDeckToken)
  const importDeckToken = useStore(state => state.importDeckToken)
  const focusSearchToken = useStore(state => state.focusSearchToken)
  const theme = useStore(state => state.config?.theme)

  const [showNewDeckDialog, setShowNewDeckDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
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

  // Native-menu drivers: Cmd+N opens the New Deck dialog, Cmd+I opens Import,
  // Cmd+F focuses the search box. Each watches its dedicated counter and skips
  // the initial 0 so we don't auto-trigger on mount.
  const lastNewDeckToken = useRef(newDeckToken)
  useEffect(() => {
    if (newDeckToken !== lastNewDeckToken.current) {
      lastNewDeckToken.current = newDeckToken
      setShowNewDeckDialog(true)
    }
  }, [newDeckToken])

  const lastImportToken = useRef(importDeckToken)
  useEffect(() => {
    if (importDeckToken !== lastImportToken.current) {
      lastImportToken.current = importDeckToken
      setShowImportDialog(true)
    }
  }, [importDeckToken])

  const lastFocusSearchToken = useRef(focusSearchToken)
  useEffect(() => {
    if (focusSearchToken !== lastFocusSearchToken.current) {
      lastFocusSearchToken.current = focusSearchToken
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
  }, [focusSearchToken])

  const handleDeleteDeck = async () => {
    if (showDeleteDialog) {
      await deleteDeck(showDeleteDialog)
      setShowDeleteDialog(null)
    }
  }

  const deckToDelete = decks.find(d => d.id === showDeleteDialog)

  return (
    <div className="h-full overflow-y-auto">
      <div
        className="px-8 pt-7 pb-5"
        style={{
          borderBottom: '2px solid var(--masthead-rule-color)',
        }}
      >
        <div className="flex items-end justify-between gap-6">
          <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap min-w-0">
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '52px',
                fontWeight: 700,
                fontStyle: 'italic',
                letterSpacing: '-0.035em',
                lineHeight: '52px',
                color: 'var(--foreground)',
              }}
            >
              Decks
            </h1>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--muted-foreground)',
                letterSpacing: '-0.01em',
              }}
            >
              {libraryTagline(theme, decks.length)}
            </span>
          </div>
          <div className="flex items-end gap-2 shrink-0">
            <ImportNewDeckDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
            <button
              onClick={() => setShowNewDeckDialog(true)}
              className="h-9 px-4 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--action-bg)',
                color: 'var(--action-fg)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                New deck
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="px-8 py-3 flex items-center gap-7 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center gap-2 flex-1 max-w-[280px]"
          style={{ borderBottom: '1px solid var(--foreground)', paddingBottom: '4px' }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--foreground)' }} />
          <input
            ref={searchInputRef}
            placeholder={`search the ${THEME_TAGLINES[theme ?? 'library'] ?? 'library'}…`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none w-full"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontStyle: 'italic',
              color: 'var(--foreground)',
            }}
          />
        </div>
        <FilterCell label="Format">
          <Select
            value={formatFilter}
            onValueChange={v => setFormatFilter(v as FormatType | 'all')}
          >
            <SelectTrigger
              className="border-0 bg-transparent shadow-none px-1 h-auto gap-1.5 focus:ring-0 focus:ring-offset-0"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--foreground)',
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value={FORMAT_TYPE.COMMANDER}>Commander</SelectItem>
              <SelectItem value={FORMAT_TYPE.STANDARD}>Standard</SelectItem>
              <SelectItem value={FORMAT_TYPE.PIONEER}>Pioneer</SelectItem>
              <SelectItem value={FORMAT_TYPE.MODERN}>Modern</SelectItem>
              <SelectItem value={FORMAT_TYPE.LEGACY}>Legacy</SelectItem>
              <SelectItem value={FORMAT_TYPE.PAUPER}>Pauper</SelectItem>
              <SelectItem value={FORMAT_TYPE.KITCHEN_TABLE}>Kitchen Table</SelectItem>
            </SelectContent>
          </Select>
        </FilterCell>
        <FilterCell label="Status">
          <div className="flex items-center gap-3" role="group" aria-label="Filter by completion status">
            {(['all', 'complete', 'incomplete'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setStatusFilter(opt)}
                aria-pressed={statusFilter === opt}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: statusFilter === opt ? 600 : 500,
                  color: statusFilter === opt ? 'var(--foreground)' : 'var(--muted-foreground)',
                  textTransform: 'capitalize',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </FilterCell>
        <FilterCell label="Colors">
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
        </FilterCell>
      </div>

      {filteredDecks.length === 0 ? (
        <div className="px-8 pt-6 text-center py-12 text-muted-foreground">
          {decks.length === 0 ? (
            <p>No decks yet. Create your first deck to get started!</p>
          ) : (
            <p>No decks match your filters.</p>
          )}
        </div>
      ) : (
        <div
          className="px-8 pt-6 pb-8 grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(180px, 16vw, 260px), 1fr))',
            columnGap: '40px',
            rowGap: '48px',
          }}
        >
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

interface FilterCellProps {
  label: string
  children: React.ReactNode
}

function FilterCell({ label, children }: FilterCellProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--muted-foreground)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
