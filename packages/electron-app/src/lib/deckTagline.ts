import { numberToWords } from '@/lib/numberToWords'
import { getCardCount } from '@/types'
import { getDeckColorIdentity } from '@mtg-deckbuilder/shared'
import { getColorIdentityName } from '@/components/ColorPips'
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

// Composes the italic editorial tagline displayed under the deck name in the
// masthead, e.g. "commander · esper · midrange · twenty-three roles defined".
// Segments collapse when their data is absent (no archetype, no roles).
export function formatDeckTagline(deck: Deck): string {
  const parts: string[] = []
  parts.push(FORMAT_TAGLINE[deck.format.type] ?? deck.format.type.replace(/_/g, ' '))

  const colorName = getColorIdentityName(getDeckColorIdentity(deck))
  parts.push(colorName.replace(/^Mono-/, '').toLowerCase())

  if (deck.archetype) {
    parts.push(deck.archetype.toLowerCase())
  }

  const rolesCount = deck.customRoles.length
  if (rolesCount > 0) {
    parts.push(`${numberToWords(rolesCount)} roles defined`)
  }

  return parts.join(' · ')
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
