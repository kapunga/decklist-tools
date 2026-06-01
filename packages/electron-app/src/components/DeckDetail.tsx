import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { ExportDropdown, type ExportDropdownHandle } from '@/components/ExportDropdown'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore, useSelectedDeck } from '@/hooks/useStore'
import { useScryfallCache } from '@/hooks/useScryfallCache'
import { getCardById } from '@/lib/scryfall'
import { DeckListView } from '@/components/DeckListView'
import { QuickAdd } from '@/components/QuickAdd'
import { ImportDialog } from '@/components/ImportDialog'
import { DeckStats } from '@/components/DeckStats'
import { NotesView } from '@/components/NotesView'
import { RoleEditModal } from '@/components/RoleEditModal'
import { SelectCommanderModal } from '@/components/SelectCommanderModal'
import { ColorPips } from '@/components/ColorPips'
import { PullListView } from '@/components/PullListView'
import { getDeckColorIdentity, showColorlessPip, getAlternates, getSideboard, getCutList, getEntriesTotalQuantity, createCardIdentifier, getAllDeckEntries, validateDeckStructure, validateFormatLegality, validateColorIdentity } from '@mtg-deckbuilder/shared'
import { getCardCount, getCardDisplayName, CARD_SET, isCommanderLikeFormat } from '@/types'
import type { RoleDefinition, CardSetName, ScryfallCard } from '@/types'
import { formatDeckTagline, formatDeckStatus } from '@/lib/deckTagline'
import { captionTagStyle, PAGE_X_PAD } from '@/lib/mastheadStyles'

type CommanderModalMode = 'set' | 'swap' | 'addPartner'

const COMMANDER_MODAL_TITLES: Record<CommanderModalMode, string> = {
  set: 'Set Commander',
  swap: 'Change Commander',
  addPartner: 'Add Partner',
}

const taglineStyle: React.CSSProperties = {
  fontFamily: 'var(--font-tagline)',
  fontSize: '17px',
  fontStyle: 'italic',
  fontWeight: 400,
  color: 'var(--muted-foreground)',
  letterSpacing: '-0.005em',
}

const bylineLedStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--muted-foreground)',
}

const bylineNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-tagline)',
  fontSize: '17px',
  fontStyle: 'italic',
  fontWeight: 500,
  color: 'var(--foreground)',
  letterSpacing: '-0.005em',
}

const bylineCapStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted-foreground)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '44px',
  fontWeight: 700,
  fontStyle: 'italic',
  letterSpacing: '-0.03em',
  lineHeight: '44px',
  color: 'var(--foreground)',
}

export function DeckDetail() {
  const deck = useSelectedDeck()
  const selectDeck = useStore(state => state.selectDeck)
  const updateDeck = useStore(state => state.updateDeck)
  const clearSelection = useStore(state => state.clearSelection)
  const setCommanders = useStore(state => state.setCommanders)
  const addCommander = useStore(state => state.addCommander)
  const exportDeckToken = useStore(state => state.exportDeckToken)
  const exportRef = useRef<ExportDropdownHandle | null>(null)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [activeTab, setActiveTab] = useState<CardSetName>(CARD_SET.MAINBOARD)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [commanderModalMode, setCommanderModalMode] = useState<CommanderModalMode | null>(null)
  const [commanderHasPartner, setCommanderHasPartner] = useState(false)
  const [isCaching, setIsCaching] = useState(false)
  const [cacheResult, setCacheResult] = useState<{ success: boolean; cachedCards: number; cachedImages: number; errors: string[] } | null>(null)

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as CardSetName)
    clearSelection()
  }, [clearSelection])

  const handleSaveCustomRoles = useCallback(async (customRoles: RoleDefinition[]) => {
    if (deck) {
      await updateDeck({ ...deck, customRoles })
    }
  }, [deck, updateDeck])

  const handlePreCache = useCallback(async (includeImages: boolean) => {
    if (!deck) return
    setIsCaching(true)
    setCacheResult(null)
    try {
      const result = await window.electronAPI.preCacheDeck(deck.id, includeImages)
      setCacheResult(result)
    } catch (error) {
      console.error('Error pre-caching deck:', error)
      setCacheResult({
        success: false,
        cachedCards: 0,
        cachedImages: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsCaching(false)
    }
  }, [deck])

  useEffect(() => {
    if (deck) {
      setEditedName(deck.name)
    }
  }, [deck?.id])

  useEffect(() => {
    window.electronAPI.setExportMenuEnabled(true)
    return () => {
      window.electronAPI.setExportMenuEnabled(false)
    }
  }, [])

  const lastExportToken = useRef(exportDeckToken)
  useEffect(() => {
    if (exportDeckToken !== lastExportToken.current) {
      lastExportToken.current = exportDeckToken
      exportRef.current?.open()
    }
  }, [exportDeckToken])

  // Detect Partner keyword on the solo commander to decide whether to show
  // "+ Partner". Only relevant at exactly one commander.
  const soloCommanderId = deck?.commanders.length === 1 ? deck.commanders[0]?.scryfallId : undefined
  useEffect(() => {
    if (!soloCommanderId) {
      setCommanderHasPartner(false)
      return
    }
    let cancelled = false
    getCardById(soloCommanderId).then(card => {
      if (!cancelled) setCommanderHasPartner(!!card?.keywords?.includes('Partner'))
    })
    return () => { cancelled = true }
  }, [soloCommanderId])

  const handleNameSave = useCallback(async () => {
    if (deck && editedName.trim() && editedName !== deck.name) {
      await updateDeck({ ...deck, name: editedName.trim() })
    }
    setIsEditingName(false)
  }, [deck, editedName, updateDeck])

  // Scryfall cache for legality checks in the masthead status. Hook runs
  // unconditionally (before the null-deck guard); entries are empty when no
  // deck is selected so it no-ops.
  const deckEntries = deck ? getAllDeckEntries(deck) : []
  const { cache: validationCache } = useScryfallCache(deckEntries)

  if (!deck) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ ...taglineStyle, fontSize: '20px' }}
      >
        select a deck
      </div>
    )
  }

  const tagline = formatDeckTagline(deck)
  const validationIssues = [
    ...validateDeckStructure(deck),
    ...validateColorIdentity(deck),
    ...validateFormatLegality(deck, validationCache),
  ]
  const statusLine = formatDeckStatus(deck, validationIssues)
  const colorIdentity = getDeckColorIdentity(deck)
  const isCommanderFormat = isCommanderLikeFormat(deck.format.type)

  return (
    <div className="h-full flex flex-col">
      {/* Cache result notification */}
      {cacheResult && (
        <div
          className="flex items-center justify-between text-sm"
          style={{
            padding: `8px ${PAGE_X_PAD}`,
            backgroundColor: cacheResult.success
              ? 'color-mix(in srgb, var(--foreground) 8%, transparent)'
              : 'color-mix(in srgb, var(--destructive) 12%, transparent)',
            color: cacheResult.success ? 'var(--foreground)' : 'var(--destructive)',
          }}
        >
          <span>
            {cacheResult.success
              ? `Cached ${cacheResult.cachedCards} cards${cacheResult.cachedImages > 0 ? ` and ${cacheResult.cachedImages} images` : ''}`
              : `Cached with ${cacheResult.errors.length} errors`}
          </span>
          <button
            onClick={() => setCacheResult(null)}
            className="text-xs hover:underline"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Back link */}
      <div style={{ padding: `20px ${PAGE_X_PAD} 4px ${PAGE_X_PAD}` }} className="flex-shrink-0">
        <button
          type="button"
          onClick={() => selectDeck(null)}
          className="hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-tagline)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'var(--muted-foreground)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← back to decks
        </button>
      </div>

      {/* Masthead — title block with 2px rule */}
      <div
        className="flex-shrink-0"
        style={{
          padding: `4px ${PAGE_X_PAD} 22px ${PAGE_X_PAD}`,
          borderBottom: '2px solid var(--masthead-rule-color)',
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Row 1 — title + color pips + deck type, as one identity line */}
          <div className="flex items-baseline justify-between gap-8 flex-wrap">
            <div className="flex items-baseline gap-4 flex-wrap min-w-0">
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
                  className="max-w-2xl"
                  style={titleStyle}
                />
              ) : (
                <h1
                  onClick={() => setIsEditingName(true)}
                  className="cursor-text hover:opacity-80 transition-opacity"
                  style={titleStyle}
                  title="Click to rename"
                >
                  {deck.name}
                </h1>
              )}
              {colorIdentity && (
                <ColorPips
                  colors={colorIdentity}
                  size="md"
                  showColorless={showColorlessPip(deck)}
                />
              )}

              {/* Deck type — inline, immediately after the pips */}
              <span style={taglineStyle}>{tagline}</span>
            </div>
          </div>

          {/* Row 2 — byline (left), action cluster (right) */}
          <div className="flex items-center justify-between gap-8 flex-wrap">
            {/* Byline — commander attribution */}
            <div className="min-w-0">
              {isCommanderFormat && (
                deck.commanders.length > 0 ? (
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span style={bylineLedStyle}>Led by</span>
                    <span style={bylineNameStyle}>
                      {deck.commanders.map(c => getCardDisplayName(c)).join(' and ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCommanderModalMode('swap')}
                      className="hover:opacity-80 transition-opacity"
                      style={bylineCapStyle}
                    >
                      change
                    </button>
                    {commanderHasPartner && deck.commanders.length === 1 && (
                      <button
                        type="button"
                        onClick={() => setCommanderModalMode('addPartner')}
                        className="hover:opacity-80 transition-opacity"
                        style={bylineCapStyle}
                      >
                        + partner
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCommanderModalMode('set')}
                    className="hover:opacity-80 transition-opacity"
                    style={{ ...bylineCapStyle, fontSize: '11px', color: 'var(--foreground)' }}
                  >
                    Set commander
                  </button>
                )
              )}
            </div>

            {/* Action cluster */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isCaching}
                    style={{ ...captionTagStyle, opacity: isCaching ? 0.6 : 1 }}
                  >
                    {isCaching && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isCaching ? 'Caching' : 'Cache'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePreCache(false)}>
                    Cache Card Data Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePreCache(true)}>
                    Cache Data + Images
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                style={captionTagStyle}
              >
                Roles
              </button>

              <ExportDropdown ref={exportRef} deck={deck} />

              <ImportDialog deckId={deck.id} sideboardSize={deck.format.sideboardSize} />
            </div>
          </div>
        </div>
      </div>

      {/* Status + Quick Add row */}
      <div
        className="flex items-center gap-4 flex-shrink-0 flex-wrap"
        style={{ padding: `14px ${PAGE_X_PAD} 14px ${PAGE_X_PAD}` }}
      >
        <span
          style={{
            fontFamily: 'var(--font-tagline)',
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'var(--foreground)',
          }}
        >
          {statusLine.count}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-tagline)',
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'var(--muted-foreground)',
          }}
        >
          ·
        </span>
        <span
          style={{
            fontFamily: 'var(--font-tagline)',
            fontSize: '16px',
            fontStyle: 'italic',
            fontWeight: statusLine.status === 'complete' ? 400 : 500,
            color: statusLine.status === 'illegal'
              ? 'var(--destructive)'
              : 'var(--muted-foreground)',
          }}
        >
          {statusLine.status}
        </span>

        <div className="flex-1 min-w-[24px]" />

        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
          }}
        >
          Quick Add
        </span>
        <div className="min-w-[280px] flex-shrink-0">
          <QuickAdd
            deckId={deck.id}
            format={deck.format}
            colorIdentity={deck.colorIdentity}
            customRoles={deck.customRoles}
            activeTab={activeTab}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div
          className="flex items-stretch flex-shrink-0"
          style={{
            padding: `0 ${PAGE_X_PAD}`,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Primary card-set tabs */}
          <TabsList className="bg-transparent h-auto p-0 gap-7 rounded-none">
            <MastheadTab value={CARD_SET.MAINBOARD} label="Cards" count={getCardCount(deck)} />
            <MastheadTab value={CARD_SET.ALTERNATES} label="Alternates" count={getEntriesTotalQuantity(getAlternates(deck))} />
            {deck.format.sideboardSize > 0 && (
              <MastheadTab value={CARD_SET.SIDEBOARD} label="Sideboard" count={getEntriesTotalQuantity(getSideboard(deck))} />
            )}
            <MastheadTab value={CARD_SET.CUT} label="Cut" count={getEntriesTotalQuantity(getCutList(deck))} />
          </TabsList>

          <div className="flex-1" />

          {/* Secondary tools tabs */}
          <TabsList className="bg-transparent h-auto p-0 gap-5 rounded-none">
            <MastheadTab value="notes" label="Notes" count={deck.notes.length} variant="secondary" />
            <MastheadTab value="pull-list" label="Pull List" variant="secondary" />
            <MastheadTab value="stats" label="Stats" variant="secondary" />
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value={CARD_SET.MAINBOARD} className="m-0 h-full">
            <DeckListView deck={deck} listType={CARD_SET.MAINBOARD} />
          </TabsContent>

          <TabsContent value={CARD_SET.ALTERNATES} className="m-0 h-full">
            <DeckListView deck={deck} listType={CARD_SET.ALTERNATES} />
          </TabsContent>

          {deck.format.sideboardSize > 0 && (
            <TabsContent value={CARD_SET.SIDEBOARD} className="m-0 h-full">
              <DeckListView deck={deck} listType={CARD_SET.SIDEBOARD} />
            </TabsContent>
          )}

          <TabsContent value={CARD_SET.CUT} className="m-0 h-full">
            <DeckListView deck={deck} listType={CARD_SET.CUT} />
          </TabsContent>

          <TabsContent value="notes" className="m-0 h-full">
            <NotesView deck={deck} />
          </TabsContent>

          <TabsContent value="pull-list" className="m-0 h-full">
            <PullListView deck={deck} />
          </TabsContent>

          <TabsContent value="stats" className="m-0 p-4 overflow-auto h-full">
            <DeckStats deck={deck} />
          </TabsContent>
        </div>
      </Tabs>

      <RoleEditModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        customRoles={deck.customRoles}
        onSave={handleSaveCustomRoles}
      />

      <SelectCommanderModal
        isOpen={commanderModalMode !== null}
        onClose={() => setCommanderModalMode(null)}
        title={commanderModalMode ? COMMANDER_MODAL_TITLES[commanderModalMode] : ''}
        requiredColorIdentity={commanderModalMode === 'swap' ? getDeckColorIdentity(deck) : undefined}
        partnerOnly={commanderModalMode === 'addPartner'}
        onSelect={(card: ScryfallCard) => {
          const identifier = createCardIdentifier(card)
          if (commanderModalMode === 'addPartner') {
            addCommander(deck.id, identifier)
          } else {
            setCommanders(deck.id, [identifier])
          }
          setCommanderModalMode(null)
        }}
      />
    </div>
  )
}

// Newspaper-section-label tab trigger. `value` drives Radix Tabs state;
// styling is theme-token-driven and varies by primary vs. secondary cluster.
function MastheadTab({
  value,
  label,
  count,
  variant = 'primary',
}: {
  value: string
  label: string
  count?: number
  variant?: 'primary' | 'secondary'
}) {
  const labelSize = variant === 'primary' ? '11px' : '10px'
  const labelTracking = variant === 'primary' ? '0.16em' : '0.18em'
  const countSize = variant === 'primary' ? '13px' : '12px'

  return (
    <TabsTrigger
      value={value}
      className="rounded-none px-0 py-3.5 h-auto bg-transparent shadow-none gap-2 border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground font-normal data-[state=active]:font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: labelSize,
        letterSpacing: labelTracking,
        textTransform: 'uppercase',
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            fontFamily: 'var(--font-tagline)',
            fontSize: countSize,
            fontStyle: 'italic',
            fontWeight: 400,
            color: 'var(--muted-foreground)',
            letterSpacing: 0,
          }}
        >
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
