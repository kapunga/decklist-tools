import type { CardEntry, Deck, ManaCostTally, PipKey, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getEntryPrimaryType, isLandEntry, getCardCount, CARD_TYPE_ORDER, enrichCards, getCmcDistribution, tallyManaCosts, getMainboard, PIP_KEYS } from '@mtg-deckbuilder/shared'
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

const PIP_NAMES: Record<PipKey, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}

/** `## Mana Pips` section: one line per nonzero pip, then generic mana on its own line. */
function manaPipsSection(tally: ManaCostTally): string[] {
  const pipLines = PIP_KEYS
    .filter(key => tally.pips[key] > 0)
    .map(key => `- ${PIP_NAMES[key]}: ${tally.pips[key]}`)
  const genericLines = tally.generic > 0 ? [`- Generic: ${tally.generic} _(total of {N} costs; not a pip)_`] : []
  const body = [...pipLines, ...genericLines]
  return body.length === 0 ? [] : ['## Mana Pips', ...body, '']
}

function sumQuantities(cards: CardEntry[]): number {
  return cards.reduce((sum, card) => sum + card.quantity, 0)
}

function commanderLabel(count: number): string {
  return count === 1 ? 'Commander' : 'Commanders'
}

/** Whole-deck counts: lands + nonlands (+ commanders) = total. */
function deckCountLines(deck: Deck, lands: number, nonlands: number): string[] {
  const commanders = deck.commanders.length
  const commanderLines = commanders > 0 ? [`- ${commanderLabel(commanders)}: ${commanders}`] : []
  return [
    '## Card Counts',
    `- Lands: ${lands}`,
    `- Nonlands: ${nonlands}`,
    ...commanderLines,
    `- Total: ${getCardCount(deck)}/${deck.format.deckSize}`,
  ]
}

/** Filtered counts: lands + nonlands = matching mainboard cards; deck total for context. */
function filteredCountLines(deck: Deck, lands: number, nonlands: number): string[] {
  const mainboardTotal = sumQuantities(getMainboard(deck))
  const commanders = deck.commanders.length
  const commanderNote = commanders > 0 ? ` (${commanderLabel(commanders).toLowerCase()} not included)` : ''
  return [
    '## Card Counts (filtered)',
    `- Lands: ${lands}`,
    `- Nonlands: ${nonlands}`,
    `- Matching: ${lands + nonlands} of ${mainboardTotal} mainboard cards${commanderNote}`,
    `- Deck total: ${getCardCount(deck)}/${deck.format.deckSize}`,
  ]
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
  lines.push(...manaPipsSection(tallyManaCosts(enriched)))

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

  // Card counts — lands and nonlands always come from the same (possibly filtered) cards
  const landCount = sumQuantities(activeCards.filter(card => isLandEntry(card, cache)))
  const nonlandCount = sumQuantities(activeCards) - landCount
  lines.push(...(filteredCardIds
    ? filteredCountLines(deck, landCount, nonlandCount)
    : deckCountLines(deck, landCount, nonlandCount)))

  return lines.join('\n')
}
