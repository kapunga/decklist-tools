import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, AlertTriangle, Settings, Crown, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore, useSelectedDeck } from '@/hooks/useStore'
import { DeckListView } from '@/components/DeckListView'
import { QuickAdd } from '@/components/QuickAdd'
import { ImportDialog } from '@/components/ImportDialog'
import { DeckStats } from '@/components/DeckStats'
import { NotesView } from '@/components/NotesView'
import { RoleEditModal } from '@/components/RoleEditModal'
import { ColorPips } from '@/components/ColorPips'
import { PullListView } from '@/components/PullListView'
import { getCardCount } from '@/types'
import type { RoleDefinition } from '@/types'

export function DeckDetail() {
  const deck = useSelectedDeck()
  const selectDeck = useStore(state => state.selectDeck)
  const updateDeck = useStore(state => state.updateDeck)
  const clearSelection = useStore(state => state.clearSelection)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [activeTab, setActiveTab] = useState('cards')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [isCaching, setIsCaching] = useState(false)
  const [cacheResult, setCacheResult] = useState<{ success: boolean; cachedCards: number; cachedImages: number; errors: string[] } | null>(null)

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    clearSelection() // Clear selection when switching tabs
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
      {/* Cache result notification */}
      {cacheResult && (
        <div className={`px-4 py-2 text-sm flex items-center justify-between ${cacheResult.success ? 'bg-green-500/10 text-green-700' : 'bg-yellow-500/10 text-yellow-700'}`}>
          <span>
            {cacheResult.success
              ? `Cached ${cacheResult.cachedCards} cards${cacheResult.cachedImages > 0 ? ` and ${cacheResult.cachedImages} images` : ''}`
              : `Cached with ${cacheResult.errors.length} errors`}
          </span>
          <button
            onClick={() => setCacheResult(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
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

          {deck.colorIdentity && deck.colorIdentity.length > 0 && (
            <ColorPips colors={deck.colorIdentity} size="sm" showColorless={false} />
          )}

          {/* Commander display for Commander format */}
          {deck.format.type === 'commander' && deck.commanders.length > 0 && (
            <div className="flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">
                {deck.commanders.map(c => c.name).join(' & ')}
              </span>
            </div>
          )}

          {deck.archetype && (
            <Badge variant="secondary">{deck.archetype}</Badge>
          )}

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isCaching}>
                  {isCaching ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  {isCaching ? 'Caching...' : 'Cache'}
                </Button>
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
            <Button variant="outline" size="sm" onClick={() => setShowRoleModal(true)}>
              <Settings className="w-4 h-4 mr-1" />
              Roles
            </Button>
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
        <QuickAdd
          deckId={deck.id}
          format={deck.format}
          colorIdentity={deck.colorIdentity}
          customRoles={deck.customRoles}
          activeTab={activeTab}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="cards">
              Cards ({getCardCount(deck)})
            </TabsTrigger>
            <TabsTrigger value="alternates">
              Alternates ({deck.alternates.length})
            </TabsTrigger>
            {deck.format.sideboardSize > 0 && (
              <TabsTrigger value="sideboard">
                Sideboard ({deck.sideboard.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="notes">
              Notes ({deck.notes.length})
            </TabsTrigger>
            <TabsTrigger value="pull-list">Pull List</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="cards" className="m-0 h-full">
            <DeckListView deck={deck} listType="cards" />
          </TabsContent>

          <TabsContent value="alternates" className="m-0 h-full">
            <DeckListView deck={deck} listType="alternates" />
          </TabsContent>

          {deck.format.sideboardSize > 0 && (
            <TabsContent value="sideboard" className="m-0 h-full">
              <DeckListView deck={deck} listType="sideboard" />
            </TabsContent>
          )}

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

      {/* Role Edit Modal */}
      <RoleEditModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        customRoles={deck.customRoles}
        onSave={handleSaveCustomRoles}
      />
    </div>
  )
}
