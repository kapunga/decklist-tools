import { useState, useEffect, useMemo, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ColorPips } from '@/components/ColorPips'
import type { Deck, DeckFormat, FormatType } from '@/types'
import { getCardCount, FORMAT_TYPE } from '@/types'
import { getDeckColorIdentity, showColorlessPip } from '@mtg-deckbuilder/shared'
import { getCardById, getCardArtCropUrl } from '@/lib/scryfall'

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
// Spread asymmetrically so multi-color decks read as a "scene," not a target.
const GRADIENT_POSITIONS = [
  { x: '30%', y: '25%' },
  { x: '75%', y: '60%' },
  { x: '20%', y: '75%' },
  { x: '80%', y: '20%' },
  { x: '50%', y: '50%' },
]

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
  const [artUrl, setArtUrl] = useState<string | null>(null)
  const colorIdentity = getDeckColorIdentity(deck) ?? []
  const cardCount = getCardCount(deck)

  const fallbackGradient = useMemo(
    () => deriveIdentityGradient(colorIdentity),
    [colorIdentity.join('')],
  )

  const glowColors = useMemo(
    () => pickDeckGlowColors(colorIdentity),
    [colorIdentity.join('')],
  )

  useEffect(() => {
    if (deck.artCardScryfallId) {
      getCardById(deck.artCardScryfallId).then(card => {
        if (card) setArtUrl(getCardArtCropUrl(card))
      })
    } else {
      setArtUrl(null)
    }
  }, [deck.artCardScryfallId])

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
    <div
      ref={cardRef}
      className="group relative aspect-[5/7] cursor-pointer overflow-hidden rounded-lg border border-border bg-background shadow-[var(--card-elevation)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[var(--card-elevation-hover)]"
      onClick={onClick}
    >
      {/* Hero — top 65% — card art OR identity gradient */}
      <div
        className="relative h-[65%] bg-cover bg-center"
        style={{
          backgroundImage: artUrl ? `url(${artUrl})` : fallbackGradient,
        }}
      >
        {/* Vignette to sink the edges and frame the center */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)' }}
        />
        {/* Bottom-fade into the title plate */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card/70 to-transparent" />

        {/* Format glyph — set-symbol pastiche in the corner */}
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full border border-accent-foreground/40 bg-card/40 backdrop-blur-sm flex items-center justify-center font-title text-[11px] font-semibold text-accent-foreground/80 tracking-wider">
          {FORMAT_GLYPHS[deck.format.type]}
        </div>

        {/* Delete button — hover-only, opposite corner from format glyph */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {/* Brass divider — theme-accent hairline */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

      {/* Title plate — bottom 35% */}
      <div className="h-[calc(35%-2px)] bg-card text-card-foreground flex flex-col p-3 gap-1.5">
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
  )
}
