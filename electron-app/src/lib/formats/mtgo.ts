import type { Deck } from '@/types'
import type { DeckFormat, ParsedCard, RenderOptions } from './types'

export const mtgoFormat: DeckFormat = {
  id: 'mtgo',
  name: 'MTGO',
  description: 'MTGO format: 4 Lightning Bolt',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    const lines = text.split('\n').map(l => l.trim())

    const cardPattern = /^(\d+)\s+(.+)$/
    let inSideboard = false
    let sawBlankLine = false

    for (const line of lines) {
      if (!line) {
        sawBlankLine = true
        continue
      }

      if (line.toLowerCase() === 'sideboard') {
        inSideboard = true
        continue
      }

      // MTGO style: blank line indicates sideboard
      if (sawBlankLine && !inSideboard) {
        inSideboard = true
      }
      sawBlankLine = false

      const match = line.match(cardPattern)
      if (match) {
        cards.push({
          name: match[2].trim(),
          quantity: parseInt(match[1], 10),
          isSideboard: inSideboard,
          isMaybeboard: false,
          isCommander: false,
          roles: []
        })
      }
    }

    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = []

    // Commander section for Commander format
    if (deck.format.type === 'commander' && deck.commanders.length > 0) {
      lines.push('Commander')
      deck.commanders.forEach(c => {
        lines.push(`1 ${c.name}`)
      })
      lines.push('')
    }

    deck.cards
      .filter(c => c.inclusion === 'confirmed')
      .forEach(c => {
        lines.push(`${c.quantity} ${c.card.name}`)
      })

    if (options.includeSideboard && deck.sideboard.length > 0) {
      lines.push('', 'Sideboard')
      deck.sideboard.forEach(c => {
        lines.push(`${c.quantity} ${c.card.name}`)
      })
    }

    return lines.join('\n')
  }
}
