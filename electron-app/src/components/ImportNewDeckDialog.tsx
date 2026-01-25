import { useState, useCallback, useEffect } from 'react'
import { Upload, Loader2, AlertCircle, Check } from 'lucide-react'
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
import { useImportCards } from '@/hooks/useImportCards'
import { formats } from '@/lib/formats'
import type { FormatType, Deck } from '@/types'

export function ImportNewDeckDialog() {
  const [open, setOpen] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [deckFormat, setDeckFormat] = useState<FormatType>('commander')
  const [importPhase, setImportPhase] = useState<'lookup' | 'saving'>('lookup')
  const [saveError, setSaveError] = useState<string | null>(null)

  const createDeck = useStore(state => state.createDeck)
  const updateDeck = useStore(state => state.updateDeck)
  const selectDeck = useStore(state => state.selectDeck)

  const {
    text,
    formatId,
    parsedCards,
    isImporting,
    importProgress,
    errors,
    mainDeckCount,
    sideboardCount,
    maybeboardCount,
    detectedFormat,
    totalCardCount,
    handleTextChange: baseHandleTextChange,
    handleFormatChange,
    lookupCards,
    reset: baseReset
  } = useImportCards()

  // Auto-generate deck name from first card
  const handleTextChange = useCallback((value: string) => {
    baseHandleTextChange(value)
  }, [baseHandleTextChange])

  // Update deck name when first card is parsed
  useEffect(() => {
    if (!deckName && parsedCards.length > 0) {
      const firstCard = parsedCards.find(c => !c.isSideboard && !c.isMaybeboard)
      if (firstCard) {
        setDeckName(`${firstCard.name} Deck`)
      }
    }
  }, [parsedCards, deckName])

  const handleImport = useCallback(async () => {
    if (parsedCards.length === 0 || !deckName.trim()) return

    setImportPhase('lookup')
    setSaveError(null)

    const { resolvedCards } = await lookupCards()

    // Phase 2: Create deck and add all cards in one batch
    setImportPhase('saving')

    try {
      const deck = await createDeck(deckName.trim(), deckFormat)

      // Group cards by list type and add them all at once
      const cardsByList: Record<string, typeof resolvedCards[0]['card'][]> = {
        cards: [],
        alternates: [],
        sideboard: []
      }
      for (const { card, listType } of resolvedCards) {
        cardsByList[listType].push(card)
      }

      // Build the complete deck with all cards
      const completeDeck: Deck = {
        ...deck,
        cards: [...deck.cards, ...cardsByList.cards],
        alternates: [...deck.alternates, ...cardsByList.alternates],
        sideboard: [...deck.sideboard, ...cardsByList.sideboard]
      }

      await updateDeck(completeDeck)

      // Navigate to the new deck
      selectDeck(deck.id)
      setOpen(false)
      resetForm()
    } catch (error) {
      setSaveError(`Failed to create deck: ${error}`)
    }
  }, [parsedCards, deckName, deckFormat, lookupCards, createDeck, updateDeck, selectDeck])

  const resetForm = useCallback(() => {
    setDeckName('')
    setDeckFormat('commander')
    setSaveError(null)
    setImportPhase('lookup')
    baseReset()
  }, [baseReset])

  const handleClose = (isOpen: boolean) => {
    if (!isImporting) {
      setOpen(isOpen)
      if (!isOpen) {
        resetForm()
      }
    }
  }

  const allErrors = saveError ? [...errors, saveError] : errors

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import Deck
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Decklist</DialogTitle>
          <DialogDescription>
            Paste your decklist to create a new deck. Supports Arena, Moxfield, MTGO, Archidekt, and simple text formats.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Deck name and format */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deck Name</label>
              <Input
                placeholder="My New Deck"
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                disabled={isImporting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Game Format</label>
              <Select
                value={deckFormat}
                onValueChange={v => setDeckFormat(v as FormatType)}
                disabled={isImporting}
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

          {/* Decklist format selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Decklist Format:</label>
            <Select value={formatId} onValueChange={handleFormatChange} disabled={isImporting}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto-detect {detectedFormat ? `(${detectedFormat.name})` : ''}
                </SelectItem>
                {formats.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Textarea for pasting */}
          <textarea
            className="w-full h-40 p-3 text-sm font-mono border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={`Paste your decklist here...

Examples:
4 Lightning Bolt
2 Counterspell (MH2) 267
1x Sol Ring (C21) 263 [Ramp]

Sideboard
2 Pyroblast`}
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            disabled={isImporting}
          />

          {/* Preview */}
          {parsedCards.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="text-sm font-medium mb-2">
                Preview: {totalCardCount} cards found
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                {mainDeckCount > 0 && <span>Main: {mainDeckCount}</span>}
                {sideboardCount > 0 && <span>Sideboard: {sideboardCount}</span>}
                {maybeboardCount > 0 && <span>Maybeboard: {maybeboardCount}</span>}
              </div>
              <div className="max-h-24 overflow-auto text-xs space-y-1">
                {parsedCards.slice(0, 15).map((card, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">{card.quantity}x</span>
                    <span>{card.name}</span>
                    {card.setCode && (
                      <span className="text-muted-foreground">({card.setCode.toUpperCase()})</span>
                    )}
                    {card.isSideboard && (
                      <span className="text-xs bg-secondary px-1 rounded">SB</span>
                    )}
                    {card.isMaybeboard && (
                      <span className="text-xs bg-secondary px-1 rounded">MB</span>
                    )}
                  </div>
                ))}
                {parsedCards.length > 15 && (
                  <div className="text-muted-foreground">
                    ... and {parsedCards.length - 15} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {importPhase === 'lookup'
                    ? `Looking up cards... ${importProgress.current}/${importProgress.total}`
                    : 'Saving deck...'}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {allErrors.length > 0 && (
            <div className="border border-destructive/50 rounded-md p-3 bg-destructive/10">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                <AlertCircle className="w-4 h-4" />
                {allErrors.length} error(s) during import
              </div>
              <div className="max-h-20 overflow-auto text-xs space-y-1">
                {allErrors.map((error, i) => (
                  <div key={i} className="text-destructive">{error}</div>
                ))}
              </div>
            </div>
          )}

          {/* Success */}
          {!isImporting && importProgress.total > 0 && allErrors.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Successfully imported {importProgress.total} cards!
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedCards.length === 0 || !deckName.trim() || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {importPhase === 'lookup' ? 'Looking up cards...' : 'Saving...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Create Deck & Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
