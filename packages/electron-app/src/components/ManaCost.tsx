import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ManaCostProps {
  cost: string | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Normalize a mana symbol for URL use
const normalizeSymbol = (symbol: string): string => {
  return symbol
    .replace(/[{}]/g, '')
    .replace(/\//g, '') // {W/U} -> WU
    .toUpperCase()
}

// Get the local URL for a mana symbol (bundled with app)
const getLocalSymbolUrl = (symbol: string): string => {
  return `/mana-symbols/${normalizeSymbol(symbol)}.svg`
}

// Get the Scryfall CDN URL for a mana symbol (fallback)
const getScryfallSymbolUrl = (symbol: string): string => {
  return `https://svgs.scryfall.io/card-symbols/${normalizeSymbol(symbol)}.svg`
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
        <ManaSymbol
          key={`${symbol}-${index}`}
          symbol={symbol}
          size={size}
        />
      ))}
    </span>
  )
}

// For rendering a single mana symbol with fallback to Scryfall CDN
export function ManaSymbol({
  symbol,
  size = 'md',
  className
}: {
  symbol: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const [useFallback, setUseFallback] = useState(false)

  const handleError = useCallback(() => {
    // If local symbol fails, try Scryfall CDN
    if (!useFallback) {
      setUseFallback(true)
    }
  }, [useFallback])

  const src = useFallback
    ? getScryfallSymbolUrl(symbol)
    : getLocalSymbolUrl(symbol)

  return (
    <img
      src={src}
      alt={`{${symbol}}`}
      title={`{${symbol}}`}
      className={cn(sizeClasses[size], 'inline-block', className)}
      loading="lazy"
      onError={handleError}
    />
  )
}
