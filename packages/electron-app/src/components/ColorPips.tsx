import { cn } from '@/lib/utils'
import { sortColorsWUBRG } from '@/lib/scryfall'
import { ManaSymbol } from './ManaCost'

interface ColorPipsProps {
  colors: string[] | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showColorless?: boolean // Whether to show C for colorless decks
}

export function ColorPips({
  colors,
  size = 'md',
  className,
  showColorless = true
}: ColorPipsProps) {
  if (!colors || colors.length === 0) {
    if (showColorless) {
      return (
        <span className={cn('inline-flex items-center gap-0.5', className)}>
          <ManaSymbol symbol="C" size={size} />
        </span>
      )
    }
    return null
  }

  const sortedColors = sortColorsWUBRG(colors)

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {sortedColors.map(color => (
        <ManaSymbol key={color} symbol={color} size={size} />
      ))}
    </span>
  )
}

// Color names for display
export const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless'
}

// Get color identity display name
export function getColorIdentityName(colors: string[] | undefined): string {
  if (!colors || colors.length === 0) return 'Colorless'
  if (colors.length === 5) return 'Five-Color'

  // Two-color guild names
  const colorSet = new Set(colors)
  if (colors.length === 2) {
    if (colorSet.has('W') && colorSet.has('U')) return 'Azorius'
    if (colorSet.has('U') && colorSet.has('B')) return 'Dimir'
    if (colorSet.has('B') && colorSet.has('R')) return 'Rakdos'
    if (colorSet.has('R') && colorSet.has('G')) return 'Gruul'
    if (colorSet.has('G') && colorSet.has('W')) return 'Selesnya'
    if (colorSet.has('W') && colorSet.has('B')) return 'Orzhov'
    if (colorSet.has('U') && colorSet.has('R')) return 'Izzet'
    if (colorSet.has('B') && colorSet.has('G')) return 'Golgari'
    if (colorSet.has('R') && colorSet.has('W')) return 'Boros'
    if (colorSet.has('G') && colorSet.has('U')) return 'Simic'
  }

  // Three-color shard/wedge names
  if (colors.length === 3) {
    // Shards (allied pairs + one enemy)
    if (colorSet.has('W') && colorSet.has('U') && colorSet.has('B')) return 'Esper'
    if (colorSet.has('U') && colorSet.has('B') && colorSet.has('R')) return 'Grixis'
    if (colorSet.has('B') && colorSet.has('R') && colorSet.has('G')) return 'Jund'
    if (colorSet.has('R') && colorSet.has('G') && colorSet.has('W')) return 'Naya'
    if (colorSet.has('G') && colorSet.has('W') && colorSet.has('U')) return 'Bant'
    // Wedges (two enemy pairs)
    if (colorSet.has('W') && colorSet.has('B') && colorSet.has('G')) return 'Abzan'
    if (colorSet.has('U') && colorSet.has('R') && colorSet.has('W')) return 'Jeskai'
    if (colorSet.has('B') && colorSet.has('G') && colorSet.has('U')) return 'Sultai'
    if (colorSet.has('R') && colorSet.has('W') && colorSet.has('B')) return 'Mardu'
    if (colorSet.has('G') && colorSet.has('U') && colorSet.has('R')) return 'Temur'
  }

  // Four-color (named after the missing color)
  if (colors.length === 4) {
    if (!colorSet.has('W')) return 'Non-White' // Glint-Eye
    if (!colorSet.has('U')) return 'Non-Blue'  // Dune-Brood
    if (!colorSet.has('B')) return 'Non-Black' // Ink-Treader
    if (!colorSet.has('R')) return 'Non-Red'   // Witch-Maw
    if (!colorSet.has('G')) return 'Non-Green' // Yore-Tiller
  }

  // Mono-color
  if (colors.length === 1) {
    return `Mono-${COLOR_NAMES[colors[0]] || colors[0]}`
  }

  return colors.join('')
}
