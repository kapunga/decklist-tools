import type { CardEntry, Deck, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getEntryPrimaryType, isLandEntry, getCardCount, CARD_TYPE_ORDER, enrichCards, getCmcDistribution, countManaPips, getMainboard } from '@mtg-deckbuilder/shared'
import { countCopies, formatMissingDataWarning, unresolvedAmong } from './formatters.js'

/**
 * Note for nonland cards left out of the curve and pips; empty when none.
 * The warning above counts every card without data (lands included), so the
 * note says it counts only the nonland ones among them.
 */
function excludedFromCurveNote(missing: CardEntry[], cache: Map<string, ScryfallCard>): string[] {
  const excluded = countCopies(missing.filter(card => !isLandEntry(card, cache)))
  if (excluded === 0) return []
  const what = excluded === 1 ? 'is a nonland card and is' : 'are nonland cards and are'
  return [`_Of the cards without Scryfall data, ${excluded} ${what} excluded from the curve and pips._`]
}

export function renderCurveView(
  deck: Deck,
  scryfallCache?: Map<string, ScryfallCard>,
  filteredCardIds?: Set<string>,
  unresolved: CardEntry[] = []
): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Mana Curve)`)
  lines.push('')

  const mainboardCards = getMainboard(deck)
  const activeCards = filteredCardIds
    ? mainboardCards.filter(c => filteredCardIds.has(c.id))
    : mainboardCards

  const cache = scryfallCache || new Map<string, ScryfallCard>()
  const enriched = enrichCards(activeCards, cache)
  const missing = unresolvedAmong(unresolved, activeCards)
  lines.push(...formatMissingDataWarning(missing))

  // CMC Distribution (cards without Scryfall data have no mana value and are left out)
  const cmcDist = getCmcDistribution(enriched)
  const hasCmcData = Object.values(cmcDist).some(v => v > 0)
  const excludedNote = excludedFromCurveNote(missing, cache)

  if (hasCmcData || excludedNote.length > 0) {
    lines.push('## Mana Curve')
    for (let cmc = 0; cmc <= 7; cmc++) {
      const count = cmcDist[cmc] || 0
      if (count > 0) {
        const label = cmc === 7 ? '7+' : String(cmc)
        const bar = '█'.repeat(Math.min(count, 20))
        lines.push(`${label.padEnd(4)} ${bar} ${count}`)
      }
    }
    lines.push(...excludedNote)
    lines.push('')
  }

  // Mana Pip Distribution
  const pips = countManaPips(enriched)
  const totalPips = pips.W + pips.U + pips.B + pips.R + pips.G + pips.C
  if (totalPips > 0) {
    lines.push('## Mana Pips')
    const colors = [
      { key: 'W' as const, name: 'White' },
      { key: 'U' as const, name: 'Blue' },
      { key: 'B' as const, name: 'Black' },
      { key: 'R' as const, name: 'Red' },
      { key: 'G' as const, name: 'Green' },
      { key: 'C' as const, name: 'Colorless' },
    ]
    for (const { key, name } of colors) {
      if (pips[key] > 0) {
        lines.push(`- ${name}: ${pips[key]}`)
      }
    }
    lines.push('')
  }

  // Type distribution
  const byType = new Map<string, number>()
  for (const card of activeCards) {
    const type = getEntryPrimaryType(card, cache)
    byType.set(type, (byType.get(type) || 0) + card.quantity)
  }

  lines.push('## Type Distribution')
  for (const type of CARD_TYPE_ORDER) {
    const count = byType.get(type) || 0
    if (count > 0) {
      const bar = '█'.repeat(Math.min(count, 20))
      lines.push(`${type.padEnd(12)} ${bar} ${count}`)
    }
  }
  lines.push('')

  // Card counts
  const landCount = activeCards
    .filter(card => isLandEntry(card, cache))
    .reduce((sum, card) => sum + card.quantity, 0)

  lines.push('## Card Counts')
  lines.push(`- Lands: ${landCount}`)
  lines.push(`- Nonlands: ${getCardCount(deck) - landCount - deck.commanders.length}`)
  lines.push(`- Total: ${getCardCount(deck)}/${deck.format.deckSize}`)

  return lines.join('\n')
}
