import { useState, useEffect, useMemo, useRef } from 'react'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SelectDeckArtModal } from '@/components/SelectDeckArtModal'
import { ColorPips } from '@/components/ColorPips'
import type { Deck, DeckFormat, FormatType } from '@/types'
import { getCardCount, FORMAT_TYPE } from '@/types'
import {
  getDeckColorIdentity,
  getMainboard,
  showColorlessPip,
  isArtCardFaceValid,
  TWO_FACED_LAYOUTS,
  ROTATED_LAYOUTS,
  type ArtCardFace,
} from '@mtg-deckbuilder/shared'
import { resolveArtCropUrl } from '@/lib/scryfall'
import { cardCache } from '@/lib/cardCacheInstance'
import { pickHeroId } from '@/lib/deckHero'
import { cardsToScryfallIdsKey } from '@/hooks/useScryfallCache'
import { useStore } from '@/hooks/useStore'

interface DeckCardPreviewProps {
  deck: Deck
  onClick: () => void
  onDelete: () => void
}

const FORMAT_LABELS: Record<FormatType, string> = {
  commander: 'Commander',
  standard: 'Standard',
  pioneer: 'Pioneer',
  modern: 'Modern',
  legacy: 'Legacy',
  pauper: 'Pauper',
  kitchen_table: 'Kitchen Table',
}

const FORMAT_GLYPHS: Record<FormatType, string> = {
  commander: 'C',
  standard: 'S',
  pioneer: 'P',
  modern: 'M',
  legacy: 'L',
  pauper: 'Pa',
  kitchen_table: 'K',
}

// Positions for stacking up to 5 radial-gradient stops in the fallback hero.
// Pushed to the corners and edges (no center stop) so the middle reads as
// negative space — the same composition that frames card art when it loads.
const GRADIENT_POSITIONS = [
  { x: '10%', y: '10%' },  // top-left
  { x: '90%', y: '90%' },  // bottom-right
  { x: '90%', y: '10%' },  // top-right
  { x: '10%', y: '90%' },  // bottom-left
  { x: '50%', y: '5%' },   // top edge (5th color spillover)
]

// `TWO_FACED_LAYOUTS` (DFC-style — distinct back URL) and `ROTATED_LAYOUTS`
// (flip layout — same URL, rendered rotated 180°) are imported from the
// shared package so the validator and these renderers agree on the rules.

// Pick a hero card from the mainboard for non-Commander decks (see `pickHeroId`).
// Takes the mainboard as its ids key so the lookup is one cache call for the whole
// deck — memory first, one disk read, one batched Scryfall request for the rest.
async function pickHeroFromMainboard(deckId: string, mainboardIdsKey: string): Promise<string | null> {
  if (mainboardIdsKey === '') return null
  const cards = await cardCache.getCards(mainboardIdsKey.split(','))
  return pickHeroId(deckId, [...cards.values()])
}

// Build a layered radial-gradient hero from a deck's color identity, using
// the theme's `--color-{w,u,b,r,g,c}` variables. Each color contributes one
// soft radial; a base linear-gradient anchors the composition. Theme-aware
// because the underlying variables retune per theme.
function deriveIdentityGradient(colors: string[]): string {
  const base = 'linear-gradient(180deg, var(--muted) 0%, var(--background) 100%)'

  if (colors.length === 0) {
    return `radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--color-c) 35%, transparent) 0%, transparent 60%), ${base}`
  }

  const layers = colors.map((c, i) => {
    const pos = GRADIENT_POSITIONS[i % GRADIENT_POSITIONS.length]
    return `radial-gradient(ellipse at ${pos.x} ${pos.y}, color-mix(in srgb, var(--color-${c.toLowerCase()}) 50%, transparent) 0%, transparent 60%)`
  })

  return [...layers, base].join(', ')
}

// Type-line eyebrow above the deck title, mirroring an MTG card's type line.
// Prefers archetype when present ("Commander · Izzet Spellslinger"),
// falls back to a generic format descriptor otherwise.
function getFormatTypeLine(format: DeckFormat, archetype?: string): string {
  const formatLabel = FORMAT_LABELS[format.type]
  if (archetype) return `${formatLabel} · ${archetype}`
  if (format.type === FORMAT_TYPE.COMMANDER) return 'Commander · Legendary'
  return `${formatLabel} · ${format.deckSize} Cards`
}

// Pick the two mana colors that drive the per-deck glow on dark themes.
// Skips B (invisible on dark grounds), de-prioritizes W when other colors
// are present (faint as a neon tube), then orders by visual dominance:
// R > U > G > W > B. Mono-B / colorless decks fall back to `c`.
const GLOW_PRIORITY = ['R', 'U', 'G', 'W', 'B']

function pickDeckGlowColors(colors: string[]): { primary: string; secondary: string } {
  const noB = colors.filter(c => c !== 'B')
  const hasNonW = noB.some(c => c !== 'W')
  const candidates = hasNonW ? noB.filter(c => c !== 'W') : noB
  if (candidates.length === 0) return { primary: 'c', secondary: 'c' }
  const ordered = [...candidates].sort(
    (a, b) => GLOW_PRIORITY.indexOf(a) - GLOW_PRIORITY.indexOf(b),
  )
  const primary = ordered[0].toLowerCase()
  const secondary = ordered[1]?.toLowerCase() ?? primary
  return { primary, secondary }
}

// Detect whether the active theme is a dark one (Cyberpunk / Gothic).
// We pull this from the html class rather than going through the store so
// the deck card stays self-contained.
const DARK_THEME_CLASSES = ['theme-cyberpunk', 'theme-gothic']

function isDarkThemeActive(): boolean {
  const classes = document.documentElement.classList
  return DARK_THEME_CLASSES.some(c => classes.contains(c))
}

// Build a 6-layer neon-sign box-shadow with explicit hex inputs. Used for
// `--card-elevation` (rest) and `--card-elevation-hover` (amplified).
// Bypasses CSS variable chains entirely — chromium's nested-var resolution
// was failing intermittently when --card-elevation referenced --deck-color-X
// referencing --color-X.
function buildNeonShadow(primaryHex: string, secondaryHex: string, hover: boolean): string {
  const tube = hover ? 90 : 70
  const edge = hover ? 40 : 25
  const inner = hover ? 95 : 75
  const mid = hover ? 70 : 55
  const outer = hover ? 38 : 28
  const innerBlur = hover ? 16 : 12
  const midBlur = hover ? 48 : 36
  const outerBlur = hover ? 100 : 80
  const outerSpread = hover ? -8 : -10
  const edgeWidth = hover ? 5 : 4
  return [
    `0 0 0 3px color-mix(in srgb, ${primaryHex} ${tube}%, transparent)`,
    `0 0 0 ${edgeWidth}px color-mix(in srgb, ${primaryHex} ${edge}%, transparent)`,
    `0 18px 36px -18px rgba(0,0,0,0.7)`,
    `0 0 ${innerBlur}px -1px color-mix(in srgb, ${primaryHex} ${inner}%, transparent)`,
    `0 0 ${midBlur}px -2px color-mix(in srgb, ${primaryHex} ${mid}%, transparent)`,
    `0 0 ${outerBlur}px ${outerSpread}px color-mix(in srgb, ${secondaryHex} ${outer}%, transparent)`,
  ].join(', ')
}

export function DeckCardPreview({ deck, onClick, onDelete }: DeckCardPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [heroCardId, setHeroCardId] = useState<string | null>(null)
  const [heroLayout, setHeroLayout] = useState<string | null>(null)
  const [artUrl, setArtUrl] = useState<string | null>(null)
  const [isArtPickerOpen, setIsArtPickerOpen] = useState(false)
  const colorIdentity = getDeckColorIdentity(deck) ?? []
  const cardCount = getCardCount(deck)
  const setDeckArtCard = useStore(state => state.setDeckArtCard)
  const storedFace: ArtCardFace = deck.artCardFace ?? 'front'
  // Read-side guardrail: if the stored face is incoherent with the current
  // card's layout (e.g. the override card was swapped to one with a different
  // layout), fall back to 'front' instead of mis-rendering. We don't rewrite
  // storage here — the next explicit toggle will overwrite cleanly.
  const heroFace: ArtCardFace =
    heroLayout && !isArtCardFaceValid(storedFace, heroLayout) ? 'front' : storedFace
  const isRotated = heroFace === 'flipped'

  const fallbackGradient = useMemo(
    () => deriveIdentityGradient(colorIdentity),
    [colorIdentity.join('')],
  )

  const glowColors = useMemo(
    () => pickDeckGlowColors(colorIdentity),
    [colorIdentity.join('')],
  )

  // Resolution chain: explicit override → commander default → highest-CMC heuristic.
  // Sets just the id; URL and layout are resolved in dependent effects below.
  // Keyed on values, not on the deck's arrays: an edit that leaves the art choice, the
  // commander and the set of mainboard cards alone does not re-run it.
  const chosenHeroId = deck.artCardScryfallId ?? deck.commanders[0]?.scryfallId ?? null
  const mainboardIdsKey = useMemo(
    () => (chosenHeroId ? '' : cardsToScryfallIdsKey(getMainboard(deck))),
    [chosenHeroId, deck],
  )
  useEffect(() => {
    if (chosenHeroId) {
      setHeroCardId(chosenHeroId)
      return
    }
    let cancelled = false
    pickHeroFromMainboard(deck.id, mainboardIdsKey).then(heuristicId => {
      if (!cancelled) setHeroCardId(heuristicId)
    })
    return () => {
      cancelled = true
    }
  }, [deck.id, chosenHeroId, mainboardIdsKey])

  // Resolve the art URL through the disk cache (or fall back to direct CDN).
  // 'flipped' shares the front URL — rotation happens render-side via CSS — so
  // we fold it down to 'front' before resolving to avoid an unnecessary
  // re-fetch on every flip toggle.
  const urlFace: 'front' | 'back' = heroFace === 'back' ? 'back' : 'front'
  useEffect(() => {
    if (!heroCardId) {
      setArtUrl(null)
      return
    }
    let cancelled = false
    resolveArtCropUrl(heroCardId, urlFace).then(url => {
      if (!cancelled) setArtUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [heroCardId, urlFace])

  // Look up the hero card's layout to gate the flip button. Goes through the card
  // cache, so it only reaches Scryfall for a card that is cached nowhere.
  useEffect(() => {
    if (!heroCardId) {
      setHeroLayout(null)
      return
    }
    let cancelled = false
    cardCache.getCard(heroCardId).then(card => {
      if (!cancelled) setHeroLayout(card?.layout ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [heroCardId])

  const isTwoFaced = heroLayout !== null && (TWO_FACED_LAYOUTS as readonly string[]).includes(heroLayout)
  const isRotatable = heroLayout !== null && (ROTATED_LAYOUTS as readonly string[]).includes(heroLayout)
  const canFlipFace = isTwoFaced || isRotatable

  const handleFlipFace = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!heroCardId) return
    // Anchor the current heroCardId when flipping so the choice doesn't drift
    // if the underlying default later changes (commander swap, mainboard edit).
    // Toggle semantics depend on layout: DFC layouts swap front↔back URLs;
    // flip layouts keep the URL and toggle the rotation state.
    const newFace: ArtCardFace = isRotatable
      ? (heroFace === 'flipped' ? 'front' : 'flipped')
      : (heroFace === 'back' ? 'front' : 'back')
    await setDeckArtCard(deck.id, heroCardId, newFace)
  }

  // Compute and inject the per-deck box-shadow whenever the theme changes
  // or the deck's glow colors change. On light themes, remove our overrides
  // so the static theme defaults from themes.css take over.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const apply = () => {
      if (!isDarkThemeActive()) {
        el.style.removeProperty('--card-elevation')
        el.style.removeProperty('--card-elevation-hover')
        return
      }
      const root = getComputedStyle(document.documentElement)
      const primaryHex = root.getPropertyValue(`--color-${glowColors.primary}`).trim()
      const secondaryHex = root.getPropertyValue(`--color-${glowColors.secondary}`).trim()
      if (!primaryHex || !secondaryHex) return
      el.style.setProperty('--card-elevation', buildNeonShadow(primaryHex, secondaryHex, false))
      el.style.setProperty('--card-elevation-hover', buildNeonShadow(primaryHex, secondaryHex, true))
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [glowColors.primary, glowColors.secondary])

  return (
    <>
    <div
      ref={cardRef}
      className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-lg border border-border bg-background shadow-[var(--card-elevation)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[var(--card-elevation-hover)]"
      onClick={onClick}
    >
      {/* Hero — top 58%, internal aspect ~1.38:1 to match Scryfall's native
          art_crop. The color-identity gradient is the base layer; when card
          art is present, it sits on top with a radial alpha mask so the
          center reads sharply and the corners reveal the color identity
          underneath as an atmospheric border. */}
      <div
        className="relative h-[58%]"
        style={{ background: fallbackGradient }}
      >
        {artUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${artUrl})`,
              transform: isRotated ? 'rotate(180deg)' : undefined,
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 95%)',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 95%)',
            }}
          />
        )}
        {/* Bottom-fade into the title plate */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card/70 to-transparent" />

        {/* Format glyph — set-symbol pastiche in the corner */}
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full border border-accent-foreground/40 bg-card/40 backdrop-blur-sm flex items-center justify-center font-title text-[11px] font-semibold text-accent-foreground/80 tracking-wider">
          {FORMAT_GLYPHS[deck.format.type]}
        </div>

        {/* Action menu — hover-only, opposite corner from format glyph */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity h-8 w-8"
              onClick={e => e.stopPropagation()}
              title="Deck actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setIsArtPickerOpen(true)}>
              Set deck art...
            </DropdownMenuItem>
            {canFlipFace && (
              <>
                <DropdownMenuItem onClick={handleFlipFace}>
                  {isRotatable
                    ? heroFace === 'flipped'
                      ? 'Show upright'
                      : 'Show flipped'
                    : heroFace === 'back'
                      ? 'Use front face'
                      : 'Use back face'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete deck
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Brass divider — theme-accent hairline */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

      {/* Title plate — bottom 42% */}
      <div className="h-[calc(42%-2px)] bg-card text-card-foreground flex flex-col p-3 gap-1.5">
        <div className="font-body font-medium text-[9px] uppercase tracking-[0.2em] text-muted-foreground line-clamp-1">
          {getFormatTypeLine(deck.format, deck.archetype)}
        </div>
        <h3 className="font-title font-semibold text-sm leading-snug uppercase tracking-wider line-clamp-2">
          {deck.name}
        </h3>
        <div className="flex-1" />
        <div className="flex items-center justify-between gap-2">
          <ColorPips
            colors={colorIdentity}
            size="sm"
            showColorless={showColorlessPip(deck)}
          />
          <span className="font-body text-[11px] text-muted-foreground tabular-nums">
            {cardCount} / {deck.format.deckSize}
          </span>
        </div>
      </div>
    </div>
    <SelectDeckArtModal
      isOpen={isArtPickerOpen}
      onClose={() => setIsArtPickerOpen(false)}
      deck={deck}
    />
    </>
  )
}
