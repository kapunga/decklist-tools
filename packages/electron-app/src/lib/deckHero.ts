import { getPrimaryType, isLandPrimaryType } from '@mtg-deckbuilder/shared'
import type { ScryfallCard } from '@/types'

type HeroCandidate = Pick<ScryfallCard, 'id' | 'type_line'> & { cmc?: number }

const manaValue = (card: HeroCandidate): number => card.cmc ?? 0

const isNonLand = (card: HeroCandidate): boolean => !isLandPrimaryType(getPrimaryType(card.type_line))

const hashOf = (text: string): number =>
  Math.abs(Array.from(text).reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) | 0, 0))

/**
 * The card whose art stands in for a deck with no commander and no chosen art: the
 * highest mana value non-land. Ties are broken by a hash of the deck id over the
 * id-sorted candidates, so a deck always shows the same art and decks sharing a top end
 * do not all show the same card. Null when there is nothing but lands.
 */
export function pickHeroId(deckId: string, cards: readonly HeroCandidate[]): string | null {
  const nonLands = cards.filter(isNonLand)
  if (nonLands.length === 0) return null

  const top = Math.max(...nonLands.map(manaValue))
  const candidates = nonLands
    .filter(card => manaValue(card) === top)
    .map(card => card.id)
    .sort((a, b) => a.localeCompare(b))

  return candidates[hashOf(deckId) % candidates.length]
}
