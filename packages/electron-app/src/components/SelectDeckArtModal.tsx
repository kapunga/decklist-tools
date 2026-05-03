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
import { buildArtCropUrlFromId, getCardPrintings, getCardById } from '@/lib/scryfall'
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
// pair that gets persisted via setDeckArtCard, and also carries enough image data
// for the top-of-modal preview. `artCropUrl` doubles as the dropdown thumbnail and
// the preview image — same URL, different render size.
interface ArtOption {
  key: string
  scryfallId: string
  face: ArtCardFace
  label: string
  artCropUrl: string
  artCropBackUrl?: string  // Populated only for DFC printings — preview shows front+back side-by-side regardless of stored face.
  isRotated: boolean       // True for flip-layout 'flipped' option; preview rotates 180°.
  illustrationId?: string  // Used to match init options against canonicals when the stored printing was deduplicated away.
}

const yearOf = (p: ScryfallCard): string => (p.released_at ? p.released_at.slice(0, 4) : '—')
const setLabel = (p: ScryfallCard): string => `${p.set.toUpperCase()} (${yearOf(p)})`

// Convert a list of printings of one logical card into a dropdown of distinct
// visual choices. Three layout branches:
//
//   - Single-faced cards: one option per unique illustration_id.
//   - DFC layouts (transform / modal_dfc / reversible_card): one option per unique
//     FRONT-face illustration_id. The back-face image is carried in previewBackUrl
//     for side-by-side preview rendering.
//   - Flip layouts (Champions of Kamigawa style): both faces share an image, so we
//     emit two options per illustration_id — upright (face='front') and rotated
//     (face='flipped'), which DeckCardPreview renders as a 180° CSS rotation.
//
// Untagged illustration_ids fall back to the printing id, so older/promo printings
// without the field don't all collapse into one bogus group.
// Pick the canonical representative of a printing group (sharing one illustration).
// Prefers non-promo over promo; among equal-promo printings, prefers newest. The
// rationale: when a printing got reprinted in a non-promo set, that's typically the
// "real" version users associate with the art; promo prereleases / variants
// shouldn't outrank a regular set printing for the same illustration.
function pickCanonical(group: ScryfallCard[]): ScryfallCard {
  return [...group].sort((a, b) => {
    const aPromo = a.promo ?? false
    const bPromo = b.promo ?? false
    if (aPromo !== bPromo) return aPromo ? 1 : -1
    return (b.released_at ?? '0000').localeCompare(a.released_at ?? '0000')
  })[0]
}

function dedupByIllustration(printings: ScryfallCard[]): ArtOption[] {
  if (printings.length === 0) return []

  const layout = printings[0].layout ?? 'normal'
  const isTwoFaced = (TWO_FACED_LAYOUTS as readonly string[]).includes(layout)
  const isRotated = (ROTATED_LAYOUTS as readonly string[]).includes(layout)

  // Group printings by their illustration key. For DFCs, the front face's
  // illustration_id is what distinguishes options; for flip and single-faced,
  // the top-level illustration_id does.
  const illoOf = (p: ScryfallCard): string => {
    if (isTwoFaced) return p.card_faces?.[0]?.illustration_id ?? `${p.id}-front`
    return p.illustration_id ?? p.id
  }

  const groups = new Map<string, ScryfallCard[]>()
  for (const p of printings) {
    const key = illoOf(p)
    const existing = groups.get(key)
    if (existing) existing.push(p)
    else groups.set(key, [p])
  }

  // Pick canonical per group (non-promo preferred), then order canonicals
  // newest-first for the dropdown's display order.
  const canonicals = Array.from(groups.entries())
    .map(([illoId, group]) => ({ illoId, card: pickCanonical(group) }))
    .sort((a, b) =>
      (b.card.released_at ?? '0000').localeCompare(a.card.released_at ?? '0000'),
    )

  const options: ArtOption[] = []

  if (isTwoFaced) {
    for (const { illoId, card: p } of canonicals) {
      const front = p.card_faces?.[0]
      const artist = front?.artist ?? p.artist ?? 'Unknown artist'
      options.push({
        key: illoId,
        scryfallId: p.id,
        face: 'front',
        label: `${artist} — ${setLabel(p)}`,
        artCropUrl: buildArtCropUrlFromId(p.id, 'front'),
        artCropBackUrl: buildArtCropUrlFromId(p.id, 'back'),
        illustrationId: illoId,
        isRotated: false,
      })
    }
    return options
  }

  if (isRotated) {
    for (const { illoId, card: p } of canonicals) {
      const artist = p.artist ?? 'Unknown artist'
      const upName = p.card_faces?.[0]?.name ?? p.name
      const downName = p.card_faces?.[1]?.name ?? p.name
      const artCropUrl = buildArtCropUrlFromId(p.id, 'front')
      options.push({
        key: `up:${illoId}`,
        scryfallId: p.id,
        face: 'front',
        label: `${upName} (upright) — ${artist} — ${setLabel(p)}`,
        artCropUrl,
        illustrationId: illoId,
        isRotated: false,
      })
      options.push({
        key: `down:${illoId}`,
        scryfallId: p.id,
        face: 'flipped',
        label: `${downName} (flipped) — ${artist} — ${setLabel(p)}`,
        artCropUrl,
        illustrationId: illoId,
        isRotated: true,
      })
    }
    return options
  }

  // Single-faced.
  for (const { illoId, card: p } of canonicals) {
    const artist = p.artist ?? 'Unknown artist'
    options.push({
      key: illoId,
      scryfallId: p.id,
      face: 'front',
      label: `${artist} — ${setLabel(p)}`,
      artCropUrl: buildArtCropUrlFromId(p.id, 'front'),
      illustrationId: illoId,
      isRotated: false,
    })
  }
  return options
}

// Build a synthetic ArtOption for a single printing+face pair. Used to seed
// the modal's pendingOption from the deck's currently-saved art. Differs from
// dedupByIllustration in that it can produce a DFC face='back' option (the
// dropdown intentionally omits these, but we still need to preview them on
// modal open if that's what's currently saved).
function buildOptionFromPrinting(p: ScryfallCard, face: ArtCardFace): ArtOption {
  const layout = p.layout ?? 'normal'
  const isTwoFaced = (TWO_FACED_LAYOUTS as readonly string[]).includes(layout)
  const isRotated = (ROTATED_LAYOUTS as readonly string[]).includes(layout)

  if (isTwoFaced) {
    const front = p.card_faces?.[0]
    const back = p.card_faces?.[1]
    const sourceFace = face === 'back' ? back : front
    const artist = sourceFace?.artist ?? p.artist ?? 'Unknown artist'
    return {
      key: `init:${p.id}:${face}`,
      scryfallId: p.id,
      face,
      label: `${artist} — ${setLabel(p)}`,
      artCropUrl: buildArtCropUrlFromId(p.id, 'front'),
      artCropBackUrl: buildArtCropUrlFromId(p.id, 'back'),
      illustrationId: p.card_faces?.[0]?.illustration_id ?? `${p.id}-front`,
      isRotated: false,
    }
  }

  if (isRotated) {
    const artist = p.artist ?? 'Unknown artist'
    const isFlipped = face === 'flipped'
    const name = (isFlipped ? p.card_faces?.[1]?.name : p.card_faces?.[0]?.name) ?? p.name
    const orientation = isFlipped ? 'flipped' : 'upright'
    return {
      key: `init:${p.id}:${face}`,
      scryfallId: p.id,
      face,
      label: `${name} (${orientation}) — ${artist} — ${setLabel(p)}`,
      artCropUrl: buildArtCropUrlFromId(p.id, 'front'),
      illustrationId: p.illustration_id ?? p.id,
      isRotated: isFlipped,
    }
  }

  const artist = p.artist ?? 'Unknown artist'
  return {
    key: `init:${p.id}`,
    scryfallId: p.id,
    face: 'front',
    label: `${artist} — ${setLabel(p)}`,
    artCropUrl: buildArtCropUrlFromId(p.id, 'front'),
    illustrationId: p.illustration_id ?? p.id,
    isRotated: false,
  }
}

export function SelectDeckArtModal({ isOpen, onClose, deck }: SelectDeckArtModalProps) {
  const setDeckArtCard = useStore(state => state.setDeckArtCard)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [printingsCache, setPrintingsCache] = useState<Record<string, ArtOption[]>>({})
  const [loadingCard, setLoadingCard] = useState<string | null>(null)
  const [pendingOption, setPendingOption] = useState<ArtOption | null>(null)
  // Tracked separately from pendingOption.face so DFC users can flip the
  // committed face by clicking either face image in the preview, without
  // changing the chosen printing. For non-DFC printings this just mirrors
  // pendingOption.face.
  const [pendingFace, setPendingFace] = useState<ArtCardFace>('front')
  // Remembers the last selected ArtOption per card name within this modal session,
  // so swapping between cards restores each card's prior selection.
  const [selectionCache, setSelectionCache] = useState<Record<string, ArtOption>>({})

  const rows = useMemo(() => buildCardRows(deck), [deck])
  const groups = useMemo(
    () =>
      SECTION_ORDER
        .map(name => ({ name, rows: rows.filter(r => r.section === name) }))
        .filter(g => g.rows.length > 0),
    [rows],
  )

  // Reset state when the modal closes/reopens, or the deck changes. Avoids
  // serving stale printings or stale pending selections across opens.
  useEffect(() => {
    if (!isOpen) {
      setExpanded(null)
      setPrintingsCache({})
      setLoadingCard(null)
      setPendingOption(null)
      setPendingFace('front')
      setSelectionCache({})
    }
  }, [isOpen, deck.id])

  // On modal open, bootstrap the picker so the preview shows whatever the deck
  // tile is currently displaying — saved override if one exists, otherwise the
  // auto-resolved default (commander). The matching row only auto-expands for
  // explicit overrides, since a default-mode deck has no "selected printing"
  // the user actively picked.
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    const isOverride = !!deck.artCardScryfallId
    const seedId = deck.artCardScryfallId ?? deck.commanders[0]?.scryfallId
    const seedFace: ArtCardFace = isOverride ? (deck.artCardFace ?? 'front') : 'front'

    if (!seedId) return

    getCardById(seedId).then(card => {
      if (cancelled || !card) return
      const option = buildOptionFromPrinting(card, seedFace)
      setPendingOption(option)
      setPendingFace(seedFace)
      const matchingRow = rows.find(r => r.name === card.name)
      if (matchingRow) {
        setSelectionCache(prev => ({ ...prev, [matchingRow.name]: option }))
        if (isOverride) setExpanded(matchingRow.name)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, deck.artCardScryfallId, deck.artCardFace, deck.commanders, rows])

  // When a row's printings finish loading, seed pendingOption with the newest
  // printing if pending isn't already pointing at one of this card's printings.
  // This makes single-printing cards a one-click save (default already correct)
  // and gives multi-printing cards a sensible starting point. The matching
  // guard preserves the auto-init effect's saved-art selection above.
  //
  // Falls back to illustration-level matching when the stored printing is a
  // non-canonical that was deduplicated away (e.g. a promo variant). This
  // silently upgrades the selection to the canonical representative without
  // changing the art shown in the preview.
  useEffect(() => {
    if (!expanded) return
    const cached = printingsCache[expanded]
    if (!cached || cached.length === 0) return

    // Restore the remembered selection for this card if one exists.
    const remembered = selectionCache[expanded]
    if (remembered && cached.some(o => o.scryfallId === remembered.scryfallId)) {
      setPendingOption(remembered)
      setPendingFace(remembered.face)
      return
    }

    if (pendingOption) {
      if (cached.some(o => o.scryfallId === pendingOption.scryfallId)) {
        setSelectionCache(prev => ({ ...prev, [expanded]: pendingOption }))
        return
      }
      const illoMatch = pendingOption.illustrationId
        ? cached.find(o => o.illustrationId === pendingOption.illustrationId)
        : undefined
      if (illoMatch) {
        setPendingOption(illoMatch)
        setPendingFace(illoMatch.face)
        setSelectionCache(prev => ({ ...prev, [expanded]: illoMatch }))
        return
      }
    }

    setPendingOption(cached[0])
    setPendingFace(cached[0].face)
    setSelectionCache(prev => ({ ...prev, [expanded]: cached[0] }))
  }, [expanded, printingsCache, pendingOption, selectionCache])

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

  const handleSave = async () => {
    if (!pendingOption) return
    await setDeckArtCard(deck.id, pendingOption.scryfallId, pendingFace)
    onClose()
  }

  const toggleExpanded = (name: string) => {
    setExpanded(prev => (prev === name ? null : name))
  }

  const handlePickPrinting = (cardName: string, optionKey: string) => {
    const option = printingsCache[cardName]?.find(o => o.key === optionKey)
    if (option) {
      setPendingOption(option)
      setPendingFace(option.face)
      setSelectionCache(prev => ({ ...prev, [cardName]: option }))
    }
  }

  // Find the dropdown option whose printing+face matches the current pendingOption,
  // for the controlled `value` prop on Radix Select. Sourcing from pendingOption
  // (rather than the saved deck art) means the dropdown reflects every pending
  // change — saved-art bootstrap, default-to-newest, and explicit user picks —
  // through the same channel.
  const findCurrentOptionKey = (cardName: string): string | undefined => {
    const cached = printingsCache[cardName]
    if (!cached || !pendingOption) return undefined
    return cached.find(
      o => o.scryfallId === pendingOption.scryfallId && o.face === pendingOption.face,
    )?.key
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Set deck art for "{deck.name}"</DialogTitle>
        </DialogHeader>

        {/* Preview pane — shows the currently-pending pick. The face that will be
            saved is marked with a focus ring. For DFCs both faces are clickable to
            switch which gets committed. For single-faced and flip-layout printings
            the (only) face is shown statically with the same selected indicator. */}
        <div className="flex items-center justify-center min-h-[220px] py-3 border-b">
          {pendingOption ? (
            <div className="flex gap-3 justify-center items-center">
              {pendingOption.artCropBackUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPendingFace('front')}
                    className={`rounded-md transition-opacity max-w-xs ${
                      pendingFace === 'front'
                        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    aria-pressed={pendingFace === 'front'}
                  >
                    <img
                      src={pendingOption.artCropUrl}
                      alt="Front face"
                      className="w-full h-auto rounded-md block"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFace('back')}
                    className={`rounded-md transition-opacity max-w-xs ${
                      pendingFace === 'back'
                        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    aria-pressed={pendingFace === 'back'}
                  >
                    <img
                      src={pendingOption.artCropBackUrl}
                      alt="Back face"
                      className="w-full h-auto rounded-md block"
                    />
                  </button>
                </>
              ) : (
                <div className="rounded-md ring-2 ring-ring ring-offset-2 ring-offset-background">
                  <img
                    src={pendingOption.artCropUrl}
                    alt=""
                    className={`max-h-[200px] w-auto rounded-md block ${
                      pendingOption.isRotated ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Select a printing below to preview
            </p>
          )}
        </div>

        <div className="flex gap-2 py-3 border-b justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={handleUseDefault}>
            Use default art
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!pendingOption}>
            Save
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
                                <Select
                                  value={findCurrentOptionKey(row.name) ?? ''}
                                  onValueChange={value => handlePickPrinting(row.name, value)}
                                >
                                  <SelectTrigger className="w-full" autoFocus>
                                    <SelectValue placeholder="Choose printing..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {printingsCache[row.name]!.map(opt => (
                                      <SelectItem key={opt.key} value={opt.key}>
                                        <div className="flex items-center gap-2">
                                          <img
                                            src={opt.artCropUrl}
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
