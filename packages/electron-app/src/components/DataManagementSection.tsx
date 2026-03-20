import { useState, useCallback } from 'react'
import { Download, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStore } from '@/hooks/useStore'

type FeedbackState = {
  type: 'success' | 'error'
  message: string
} | null

export function DataManagementSection() {
  const loadData = useStore(state => state.loadData)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setFeedback(null)
    try {
      const result = await window.electronAPI.exportCollection()
      if (result.cancelled) {
        // User cancelled the dialog, no feedback needed
      } else if (result.success) {
        setFeedback({ type: 'success', message: 'Collection exported successfully.' })
      } else {
        setFeedback({ type: 'error', message: result.error || 'Export failed.' })
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Export failed.' })
    } finally {
      setExporting(false)
    }
  }, [])

  const handleImport = useCallback(async () => {
    setShowImportDialog(false)
    setImporting(true)
    setFeedback(null)
    try {
      const result = await window.electronAPI.importCollection()
      if (result.cancelled) {
        // User cancelled the file dialog, no feedback needed
      } else if (result.success) {
        // Refresh the store to reflect imported data
        await loadData()
        const warnings = result.warnings && result.warnings.length > 0
          ? ` (${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''})`
          : ''
        setFeedback({
          type: 'success',
          message: `Imported ${result.deckCount} deck${result.deckCount !== 1 ? 's' : ''} successfully${warnings}.`
        })
      } else {
        setFeedback({ type: 'error', message: result.error || 'Import failed.' })
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Import failed.' })
    } finally {
      setImporting(false)
    }
  }, [loadData])

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground mb-4">
          Export your entire collection to a backup file, or restore from a previous backup.
          Cache data and images are excluded — use "Load All Cards" to rebuild those after importing.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || importing}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export Collection
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { setFeedback(null); setShowImportDialog(true) }}
            disabled={exporting || importing}
            className="gap-2"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Import Collection
          </Button>
        </div>

        {feedback && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {feedback.message}
          </div>
        )}
      </div>

      {/* Import Confirmation Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Collection</DialogTitle>
            <DialogDescription>
              Importing will <strong>replace all existing data</strong> including decks, roles, settings,
              and your interest list. This cannot be undone. Consider exporting your current collection
              first as a backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleImport}
            >
              Import & Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
