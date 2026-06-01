import { numberToWords } from '@/lib/numberToWords'
import { getCardCount } from '@/types'
import type { Deck, ValidationIssue } from '@/types'

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

export type DeckStatus = 'complete' | 'incomplete' | 'illegal'

export interface DeckStatusLine {
  count: string
  status: DeckStatus
}

// Derives the masthead status word from validation issues, in priority order:
//   illegal    — any legality issue (off-color-identity, banned/not-legal) OR a
//                copy-limit violation (too many of a card the format restricts)
//   incomplete — legal, but not yet at the required deck size
//   complete   — legal and at a valid total size
// `issues` come from the shared validators; pass [] to treat the deck as legal
// (e.g. before the Scryfall cache needed for legality checks has loaded).
export function formatDeckStatus(deck: Deck, issues: ValidationIssue[] = []): DeckStatusLine {
  const cardCount = getCardCount(deck)
  const target = deck.format.deckSize

  const isIllegal = issues.some(
    issue => issue.category === 'legality' || issue.code === 'card_limit_exceeded',
  )

  const status: DeckStatus = isIllegal
    ? 'illegal'
    : cardCount >= target
      ? 'complete'
      : 'incomplete'

  return {
    count: `${numberToWords(cardCount)} of ${numberToWords(target)}`,
    status,
  }
}
