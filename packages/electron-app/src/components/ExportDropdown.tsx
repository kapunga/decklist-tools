import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Check, Copy, Save } from 'lucide-react'
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
import { getFormat, getMainboard, getSideboard, getAlternates } from '@mtg-deckbuilder/shared'
import { captionTagStyle } from '@/lib/mastheadStyles'
import type { Deck } from '@/types'
import type { DeckExportFormatId, DeckExportSection } from '@/vite-env'

interface Props {
  deck: Deck
}

export interface ExportDropdownHandle {
  open: () => void
}

// Trigger label flashes "Copied!" briefly after a successful clipboard copy.
const COPIED_FLASH_MS = 1400

// One row in the dropdown — describes a single Copy/Save action.
interface ExportItem {
  formatId: DeckExportFormatId
  label: string
  section?: DeckExportSection
}

// Build the per-deck export menu. Arena and MTGO are intentionally excluded —
// Arena/Mythic Tools doesn't have a usable import flow we can target, and
// MTGO's import is offline-client-only. Moxfield expands into per-section
// items because its import UI accepts each section into a separate paste box;
// empty sections are hidden so a typical Commander deck shows just one item.
function buildExportItems(deck: Deck): ExportItem[] {
  const items: ExportItem[] = []
  const hasMain = getMainboard(deck).length > 0 || deck.commanders.length > 0
  const hasSide = getSideboard(deck).length > 0
  const hasAlt = getAlternates(deck).length > 0

  if (hasMain) items.push({ formatId: 'moxfield', label: 'Moxfield (mainboard)', section: 'mainboard' })
  if (hasSide) items.push({ formatId: 'moxfield', label: 'Moxfield (sideboard)', section: 'sideboard' })
  if (hasAlt) items.push({ formatId: 'moxfield', label: 'Moxfield (maybeboard)', section: 'maybeboard' })

  items.push({ formatId: 'archidekt', label: 'Archidekt' })
  items.push({ formatId: 'simple', label: 'Simple Text' })

  return items
}

export const ExportDropdown = forwardRef<ExportDropdownHandle, Props>(function ExportDropdown({ deck }, ref) {
  const [open, setOpen] = useState(false)
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), [])

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
  }, [])

  const items = buildExportItems(deck)

  const handleCopy = async (item: ExportItem) => {
    const fmt = getFormat(item.formatId)
    if (!fmt) return
    const text = fmt.render(deck, {
      includeSideboard: true,
      includeMaybeboard: true,
      section: item.section,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLabel(item.label)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setCopiedLabel(null), COPIED_FLASH_MS)
    } catch (error) {
      console.error('Failed to copy decklist:', error)
    }
  }

  const handleSave = async (item: ExportItem) => {
    try {
      await window.electronAPI.exportDeck({
        deckId: deck.id,
        format: item.formatId,
        includeSideboard: true,
        includeMaybeboard: true,
        section: item.section,
      })
    } catch (error) {
      console.error('Failed to save decklist:', error)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" style={captionTagStyle}>
          {copiedLabel ? (
            <>
              <Check className="w-3 h-3" />
              Copied {copiedLabel}
            </>
          ) : (
            'Export'
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Copy to Clipboard
        </DropdownMenuLabel>
        {items.map((item, idx) => (
          <DropdownMenuItem key={`copy-${idx}-${item.formatId}-${item.section ?? 'all'}`} onClick={() => handleCopy(item)}>
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Save className="w-4 h-4 mr-2" />
            Save to File
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {items.map((item, idx) => (
              <DropdownMenuItem key={`save-${idx}-${item.formatId}-${item.section ?? 'all'}`} onClick={() => handleSave(item)}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
