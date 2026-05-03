import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useStore } from '@/hooks/useStore'
import { buildArtCropUrlFromId, getCardPrintings } from '@/lib/scryfall'
import {
  getMainboard,
  getSideboard,
  getAlternates,
  TWO_FACED_LAYOUTS,
  ROTATED_LAYOUTS,
  type ArtCardFace,
} from '@mtg-deckbuilder/shared'
import type { Deck, ScryfallCard } from '@/types'

interface SelectDeckArtModalProps {
  isOpen: boolean
  onClose: () => void
  deck: Deck
}

type SectionName = 'Commanders' | 'Mainboard' | 'Sideboard' | 'Alternates'

interface CardRow {
  name: string
  scryfallId: string
  section: SectionName
}

// Build a deduped, section-grouped row list. A card appearing in multiple sections
// surfaces under the first section it's found in (Commanders → Mainboard → Sideboard
// → Alternates). Cards without a scryfallId are skipped — we can't show a thumbnail
// or fetch printings for them.
function buildCardRows(deck: Deck): CardRow[] {
  const seen = new Set<string>()
  const rows: CardRow[] = []

  for (const c of deck.commanders) {
    if (!c.scryfallId || seen.has(c.name)) continue
    seen.add(c.name)
    rows.push({ name: c.name, scryfallId: c.scryfallId, section: 'Commanders' })
  }

  const sections: { name: Exclude<SectionName, 'Commanders'>; entries: ReturnType<typeof getMainboard> }[] = [
    { name: 'Mainboard', entries: getMainboard(deck) },
    { name: 'Sideboard', entries: getSideboard(deck) },
    { name: 'Alternates', entries: getAlternates(deck) },
  ]

  for (const section of sections) {
    for (const entry of section.entries) {
      if (!entry.card.scryfallId || seen.has(entry.card.name)) continue
      seen.add(entry.card.name)
      rows.push({ name: entry.card.name, scryfallId: entry.card.scryfallId, section: section.name })
    }
  }

  return rows
}

const SECTION_ORDER: readonly SectionName[] = ['Commanders', 'Mainboard', 'Sideboard', 'Alternates']

// One selectable item in the printings dropdown. Maps 1:1 to the (scryfallId, face)
// pair that gets persisted via setDeckArtCard.
interface ArtOption {
  key: string
  scryfallId: string
  face: ArtCardFace
  label: string
  thumbUrl: string
}

// Convert a list of printings of one logical card into a dropdown of distinct
// visual choices. Three layout branches:
//
//   - Single-faced cards: one option per unique illustration_id.
//   - DFC layouts (transform / modal_dfc / reversible_card): each face has its own
//     illustration_id; we emit one option per (face, illustration_id) pair.
//   - Flip layouts (Champions of Kamigawa style): both faces share an image, so we
//     emit two options per illustration_id — upright (face='front') and rotated
//     (face='flipped'), which DeckCardPreview renders as a 180° CSS rotation.
//
// Untagged illustration_ids fall back to the printing id, so older/promo printings
// without the field don't all collapse into one bogus group.
function dedupByIllustration(printings: ScryfallCard[]): ArtOption[] {
  if (printings.length === 0) return []

  const layout = printings[0].layout ?? 'normal'
  const isTwoFaced = (TWO_FACED_LAYOUTS as readonly string[]).includes(layout)
  const isRotated = (ROTATED_LAYOUTS as readonly string[]).includes(layout)

  // Earliest released first. Missing released_at sorts last.
  const sorted = [...printings].sort((a, b) =>
    (a.released_at ?? '9999').localeCompare(b.released_at ?? '9999'),
  )

  const yearOf = (p: ScryfallCard) => (p.released_at ? p.released_at.slice(0, 4) : '—')
  const setLabel = (p: ScryfallCard) => `${p.set.toUpperCase()} (${yearOf(p)})`

  const options: ArtOption[] = []
  const seen = new Set<string>()

  if (isTwoFaced) {
    for (const faceIndex of [0, 1] as const) {
      for (const p of sorted) {
        const cardFace = p.card_faces?.[faceIndex]
        const illoId = cardFace?.illustration_id ?? `${p.id}-face${faceIndex}`
        const key = `face${faceIndex}:${illoId}`
        if (seen.has(key)) continue
        seen.add(key)
        const artist = cardFace?.artist ?? p.artist ?? 'Unknown artist'
        const orientation: ArtCardFace = faceIndex === 0 ? 'front' : 'back'
        const prefix = faceIndex === 0 ? 'Front' : 'Back'
        options.push({
          key,
          scryfallId: p.id,
          face: orientation,
          label: `${prefix}: ${artist} — ${setLabel(p)}`,
          thumbUrl: buildArtCropUrlFromId(p.id, orientation),
        })
      }
    }
    return options
  }

  if (isRotated) {
    for (const p of sorted) {
      const illoId = p.illustration_id ?? p.id
      if (seen.has(illoId)) continue
      seen.add(illoId)
      const artist = p.artist ?? 'Unknown artist'
      const upName = p.card_faces?.[0]?.name ?? p.name
      const downName = p.card_faces?.[1]?.name ?? p.name
      // Both orientations share the same image — rotation is CSS, not a different
      // file — so the URL is built with face='front' for both.
      const thumbUrl = buildArtCropUrlFromId(p.id, 'front')
      options.push({
        key: `up:${illoId}`,
        scryfallId: p.id,
        face: 'front',
        label: `${upName} (upright) — ${artist} — ${setLabel(p)}`,
        thumbUrl,
      })
      options.push({
        key: `down:${illoId}`,
        scryfallId: p.id,
        face: 'flipped',
        label: `${downName} (flipped) — ${artist} — ${setLabel(p)}`,
        thumbUrl,
      })
    }
    return options
  }

  // Single-faced.
  for (const p of sorted) {
    const illoId = p.illustration_id ?? p.id
    if (seen.has(illoId)) continue
    seen.add(illoId)
    const artist = p.artist ?? 'Unknown artist'
    options.push({
      key: illoId,
      scryfallId: p.id,
      face: 'front',
      label: `${artist} — ${setLabel(p)}`,
      thumbUrl: buildArtCropUrlFromId(p.id, 'front'),
    })
  }
  return options
}

export function SelectDeckArtModal({ isOpen, onClose, deck }: SelectDeckArtModalProps) {
  const setDeckArtCard = useStore(state => state.setDeckArtCard)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [printingsCache, setPrintingsCache] = useState<Record<string, ArtOption[]>>({})
  const [loadingCard, setLoadingCard] = useState<string | null>(null)

  const rows = useMemo(() => buildCardRows(deck), [deck])
  const groups = useMemo(
    () =>
      SECTION_ORDER
        .map(name => ({ name, rows: rows.filter(r => r.section === name) }))
        .filter(g => g.rows.length > 0),
    [rows],
  )

  // Reset cache and expansion when the modal closes/reopens, or the deck changes.
  // Avoids serving stale printings if the deck pivots between opens.
  useEffect(() => {
    if (!isOpen) {
      setExpanded(null)
      setPrintingsCache({})
      setLoadingCard(null)
    }
  }, [isOpen, deck.id])

  // Fetch printings for the expanded card if not already cached.
  useEffect(() => {
    if (!expanded) return
    if (printingsCache[expanded]) return

    let cancelled = false
    setLoadingCard(expanded)
    getCardPrintings(expanded).then(result => {
      if (cancelled) return
      const printings: ScryfallCard[] = result?.data ?? []
      const options = dedupByIllustration(printings)
      setPrintingsCache(prev => ({ ...prev, [expanded]: options }))
      setLoadingCard(prev => (prev === expanded ? null : prev))
    })

    return () => {
      cancelled = true
    }
  }, [expanded, printingsCache])

  const handleUseDefault = async () => {
    await setDeckArtCard(deck.id, undefined, undefined)
    onClose()
  }

  const toggleExpanded = (name: string) => {
    setExpanded(prev => (prev === name ? null : name))
  }

  const handlePickPrinting = async (cardName: string, optionKey: string) => {
    const option = printingsCache[cardName]?.find(o => o.key === optionKey)
    if (!option) return
    await setDeckArtCard(deck.id, option.scryfallId, option.face)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Set deck art for "{deck.name}"</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 pb-3 border-b">
          <Button variant="outline" size="sm" onClick={handleUseDefault}>
            Use default art
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards in this deck yet.</p>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <div key={group.name}>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-2">
                    {group.name}
                  </div>
                  <div className="space-y-0.5">
                    {group.rows.map(row => {
                      const isOpen = expanded === row.name
                      return (
                        <div key={row.name}>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(row.name)}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent text-left"
                          >
                            <img
                              src={buildArtCropUrlFromId(row.scryfallId)}
                              alt=""
                              className="h-8 w-12 rounded-sm object-cover bg-muted"
                              loading="lazy"
                            />
                            <span className="flex-1 text-sm font-medium">{row.name}</span>
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="ml-[60px] mt-2 mb-3">
                              {loadingCard === row.name ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Loading printings...
                                </div>
                              ) : printingsCache[row.name]?.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">
                                  No printings found.
                                </p>
                              ) : printingsCache[row.name] ? (
                                <Select onValueChange={value => handlePickPrinting(row.name, value)}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose printing..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {printingsCache[row.name]!.map(opt => (
                                      <SelectItem key={opt.key} value={opt.key}>
                                        <div className="flex items-center gap-2">
                                          <img
                                            src={opt.thumbUrl}
                                            alt=""
                                            className="h-6 w-9 rounded-sm object-cover bg-muted"
                                          />
                                          <span className="text-sm">{opt.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
