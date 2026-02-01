import type { Deck, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getPrimaryType, getCardCount, CARD_TYPE_ORDER, enrichCards, getCmcDistribution, countManaPips } from '@mtg-deckbuilder/shared'

export function renderCurveView(deck: Deck, scryfallCache?: Map<string, ScryfallCard>, filteredCardIds?: Set<string>): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Mana Curve)`)
  lines.push('')

  const confirmedCards = deck.cards.filter((c) => c.inclusion === 'confirmed')
  const activeCards = filteredCardIds
    ? confirmedCards.filter(c => filteredCardIds.has(c.id))
    : confirmedCards

  const cache = scryfallCache || new Map<string, ScryfallCard>()
  const enriched = enrichCards(activeCards, cache)

  // CMC Distribution
  const cmcDist = getCmcDistribution(enriched)
  const hasCmcData = Object.values(cmcDist).some(v => v > 0)

  if (hasCmcData) {
    lines.push('## Mana Curve')
    for (let cmc = 0; cmc <= 7; cmc++) {
      const count = cmcDist[cmc] || 0
      if (count > 0) {
        const label = cmc === 7 ? '7+' : String(cmc)
        const bar = '█'.repeat(Math.min(count, 20))
        lines.push(`${label.padEnd(4)} ${bar} ${count}`)
      }
    }
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
    const type = getPrimaryType(card.typeLine || 'Unknown')
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
  let landCount = 0
  for (const card of activeCards) {
    if ((card.typeLine || '').toLowerCase().includes('land')) {
      landCount += card.quantity
    }
  }

  lines.push('## Card Counts')
  lines.push(`- Lands: ${landCount}`)
  lines.push(`- Nonlands: ${getCardCount(deck) - landCount - deck.commanders.length}`)
  lines.push(`- Total: ${getCardCount(deck)}/${deck.format.deckSize}`)

  return lines.join('\n')
}
