import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Upload, Check, Copy, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formats, getFormat } from '@mtg-deckbuilder/shared'
import type { Deck } from '@/types'
import type { DeckExportFormatId } from '@/vite-env'

interface Props {
  deck: Deck
}

export interface ExportDropdownHandle {
  open: () => void
}

// Trigger label flashes "Copied!" briefly after a successful clipboard copy.
const COPIED_FLASH_MS = 1400

export const ExportDropdown = forwardRef<ExportDropdownHandle, Props>(function ExportDropdown({ deck }, ref) {
  const [open, setOpen] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), [])

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
  }, [])

  const handleCopy = async (formatId: DeckExportFormatId) => {
    const fmt = getFormat(formatId)
    if (!fmt) return
    const text = fmt.render(deck, { includeSideboard: true, includeMaybeboard: true })
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(fmt.name)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setCopiedFormat(null), COPIED_FLASH_MS)
    } catch (error) {
      console.error('Failed to copy decklist:', error)
    }
  }

  const handleSave = async (formatId: DeckExportFormatId) => {
    try {
      await window.electronAPI.exportDeck({
        deckId: deck.id,
        format: formatId,
        includeSideboard: true,
        includeMaybeboard: true,
      })
    } catch (error) {
      console.error('Failed to save decklist:', error)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {copiedFormat ? (
            <>
              <Check className="w-4 h-4 mr-1 text-green-500" />
              Copied {copiedFormat}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-1" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Copy to Clipboard
        </DropdownMenuLabel>
        {formats.map(fmt => (
          <DropdownMenuItem key={`copy-${fmt.id}`} onClick={() => handleCopy(fmt.id as DeckExportFormatId)}>
            {fmt.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Save className="w-4 h-4 mr-2" />
            Save to File
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {formats.map(fmt => (
              <DropdownMenuItem key={`save-${fmt.id}`} onClick={() => handleSave(fmt.id as DeckExportFormatId)}>
                {fmt.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
