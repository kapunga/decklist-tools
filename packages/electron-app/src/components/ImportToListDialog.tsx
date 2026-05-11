import { useState, useCallback } from 'react'
import { Upload, Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { formats } from '@mtg-deckbuilder/shared'
import { ImportFileButton } from '@/components/ImportFileButton'

interface ImportToListDialogProps {
  listId: string
  /** When true, render as a small Import button (default). When false, render children only as the trigger. */
  triggerLabel?: string
}

export function ImportToListDialog({ listId, triggerLabel = 'Import' }: ImportToListDialogProps) {
  const [open, setOpen] = useState(false)
  const addEntriesToList = useStore(state => state.addEntriesToList)

  const {
    text, formatId, parsedCards, isImporting, importProgress, errors,
    mainDeckCount, sideboardCount, maybeboardCount, detectedFormat, totalCardCount,
    handleTextChange, handleFormatChange, lookupCards, reset,
  } = useImportCards()

  const handleImport = useCallback(async () => {
    const { resolvedCards, errors: importErrors } = await lookupCards()
    if (importErrors.length === 0 && resolvedCards.length > 0) {
      await addEntriesToList(listId, resolvedCards.map(r => r.card))
      setOpen(false)
      reset()
    }
  }, [lookupCards, listId, addEntriesToList, reset])

  const handleClose = (isOpen: boolean) => {
    if (!isImporting) {
      setOpen(isOpen)
      if (!isOpen) reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import to list</DialogTitle>
          <DialogDescription>
            Paste a card list. All entries are added to this list — sideboard/maybeboard markers are ignored.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 p-1 -m-1">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Format:</label>
            <Select value={formatId} onValueChange={handleFormatChange}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto-detect {detectedFormat ? `(${detectedFormat.format.name})` : ''}
                </SelectItem>
                {formats.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ImportFileButton onFileLoaded={handleTextChange} disabled={isImporting} />
          </div>

          <textarea
            className="w-full h-48 p-3 text-sm font-mono border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={'Paste your list here...\n\n4 Lightning Bolt\n2 Counterspell (MH2) 267'}
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            disabled={isImporting}
          />

          {parsedCards.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="text-sm font-medium mb-2">Preview: {totalCardCount} cards found</div>
              <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                {mainDeckCount > 0 && <span>Main: {mainDeckCount}</span>}
                {sideboardCount > 0 && <span>Sideboard: {sideboardCount}</span>}
                {maybeboardCount > 0 && <span>Maybeboard: {maybeboardCount}</span>}
              </div>
              <div className="max-h-32 overflow-auto text-xs space-y-1">
                {parsedCards.slice(0, 20).map((card, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">{card.quantity}x</span>
                    <span>{card.name}</span>
                    {card.setCode && <span className="text-muted-foreground">({card.setCode.toUpperCase()})</span>}
                  </div>
                ))}
                {parsedCards.length > 20 && (
                  <div className="text-muted-foreground">... and {parsedCards.length - 20} more</div>
                )}
              </div>
            </div>
          )}

          {isImporting && (
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Importing... {importProgress.current}/{importProgress.total}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="border border-destructive/50 rounded-md p-3 bg-destructive/10">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                <AlertCircle className="w-4 h-4" />
                {errors.length} error(s) during import
              </div>
              <div className="max-h-24 overflow-auto text-xs space-y-1">
                {errors.map((error, i) => (
                  <div key={i} className="text-destructive">{error}</div>
                ))}
              </div>
            </div>
          )}

          {!isImporting && importProgress.total > 0 && errors.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Successfully imported {importProgress.total} cards!
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isImporting}>Cancel</Button>
          <Button onClick={handleImport} disabled={parsedCards.length === 0 || isImporting}>
            {isImporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Import {parsedCards.length} cards</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
