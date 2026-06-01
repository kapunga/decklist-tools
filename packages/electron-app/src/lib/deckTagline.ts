import { numberToWords } from '@/lib/numberToWords'
import { getCardCount } from '@/types'
import type { Deck } from '@/types'

const FORMAT_TAGLINE: Record<string, string> = {
  commander: 'commander',
  standard: 'standard',
  modern: 'modern',
  pioneer: 'pioneer',
  legacy: 'legacy',
  pauper: 'pauper',
  kitchen_table: 'kitchen table',
}

// The italic editorial "deck type" label shown in the masthead title row —
// just the format, e.g. "commander" or "pauper". Color identity (ColorPips),
// role count (Roles affordance), and archetype are all intentionally omitted
// so the header stays a clean identity line rather than a metadata dump.
export function formatDeckTagline(deck: Deck): string {
  return FORMAT_TAGLINE[deck.format.type] ?? deck.format.type.replace(/_/g, ' ')
}

export type DeckStatus = 'valid' | 'incomplete'

export interface DeckStatusLine {
  count: string
  status: DeckStatus
}

// "sixty-five of one hundred" + a status enum the masthead colors via theme tokens.
export function formatDeckStatus(deck: Deck): DeckStatusLine {
  const cardCount = getCardCount(deck)
  const target = deck.format.deckSize
  const status: DeckStatus = cardCount >= target ? 'valid' : 'incomplete'
  return {
    count: `${numberToWords(cardCount)} of ${numberToWords(target)}`,
    status,
  }
}
