import type { Deck } from '@/types'
import type { DeckFormat, ParsedCard, RenderOptions } from './types'

export const arenaFormat: DeckFormat = {
  id: 'arena',
  name: 'MTG Arena / Mythic Tools',
  description: 'MTG Arena format: 4 Lightning Bolt (M21) 199 or 1x Card (SET) 123',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    const lines = text.split('\n').map(l => l.trim())

    // Pattern: "1x Card Name (SET) 123" or "1 Card Name (SET) 123"
    // Also handles trailing markers like *F*, *E* and special collector numbers like 81p, 248s
    const cardPattern = /^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+?)(?:\s+\*[A-Z]\*)*$/
    const simplePattern = /^(\d+)x?\s+(.+)$/

    let inSideboard = false
    let inMaybeboard = false

    for (const line of lines) {
      if (!line) continue

      const lower = line.toLowerCase()
      if (lower === 'deck' || lower === 'commander') continue
      if (lower === 'sideboard') {
        inSideboard = true
        inMaybeboard = false
        continue
      }
      if (lower === 'maybeboard' || lower === 'considering') {
        inMaybeboard = true
        inSideboard = false
        continue
      }

      let match = line.match(cardPattern)
      if (match) {
        cards.push({
          name: match[2].trim(),
          setCode: match[3].toLowerCase(),
          collectorNumber: match[4],
          quantity: parseInt(match[1], 10),
          isSideboard: inSideboard,
          isMaybeboard: inMaybeboard,
          tags: []
        })
        continue
      }

      match = line.match(simplePattern)
      if (match) {
        cards.push({
          name: match[2].trim(),
          quantity: parseInt(match[1], 10),
          isSideboard: inSideboard,
          isMaybeboard: inMaybeboard,
          tags: []
        })
      }
    }

    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = ['Deck']

    deck.cards
      .filter(c => c.inclusion === 'confirmed')
      .forEach(c => {
        lines.push(
          `${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber}`
        )
      })

    if (options.includeSideboard && deck.sideboard.length > 0) {
      lines.push('', 'Sideboard')
      deck.sideboard.forEach(c => {
        lines.push(
          `${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber}`
        )
      })
    }

    if (options.includeMaybeboard) {
      const maybe = [
        ...deck.cards.filter(c => c.inclusion === 'considering'),
        ...deck.alternates
      ]
      if (maybe.length > 0) {
        lines.push('', 'Maybeboard')
        maybe.forEach(c => {
          lines.push(
            `${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber}`
          )
        })
      }
    }

    return lines.join('\n')
  }
}
