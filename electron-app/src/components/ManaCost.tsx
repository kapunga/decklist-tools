import { cn } from '@/lib/utils'

interface ManaCostProps {
  cost: string | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Mapping from mana symbols to Scryfall SVG URLs
// Format: https://svgs.scryfall.io/card-symbols/{SYMBOL}.svg
const getSymbolUrl = (symbol: string): string => {
  // Normalize the symbol (remove braces, handle special cases)
  const normalized = symbol
    .replace(/[{}]/g, '')
    .replace(/\//g, '') // {W/U} -> WU
    .toUpperCase()
  return `https://svgs.scryfall.io/card-symbols/${normalized}.svg`
}

// Parse mana cost string into individual symbols
// Examples: "{2}{W}{U}", "{X}{X}{B}", "{W/U}{W/U}", "{2/W}"
function parseManaCost(cost: string): string[] {
  if (!cost) return []

  const symbols: string[] = []
  const regex = /\{([^}]+)\}/g
  let match

  while ((match = regex.exec(cost)) !== null) {
    symbols.push(match[1])
  }

  return symbols
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

export function ManaCost({ cost, size = 'md', className }: ManaCostProps) {
  if (!cost) return null

  const symbols = parseManaCost(cost)

  if (symbols.length === 0) return null

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {symbols.map((symbol, index) => (
        <img
          key={`${symbol}-${index}`}
          src={getSymbolUrl(symbol)}
          alt={`{${symbol}}`}
          title={`{${symbol}}`}
          className={cn(sizeClasses[size], 'inline-block')}
          loading="lazy"
        />
      ))}
    </span>
  )
}

// For rendering a single mana symbol
export function ManaSymbol({
  symbol,
  size = 'md',
  className
}: {
  symbol: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <img
      src={getSymbolUrl(symbol)}
      alt={`{${symbol}}`}
      title={`{${symbol}}`}
      className={cn(sizeClasses[size], 'inline-block', className)}
      loading="lazy"
    />
  )
}
