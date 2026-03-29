import type { Deck } from '../types/index.js'
import type { DeckExportFormat, ParsedCard, RenderOptions } from './types.js'
import { getConfirmedCards, parseLinesWithSections, type LineParserConfig } from './utils.js'

const mtgoConfig: LineParserConfig = {
  detectSection(line: string, prevBlank: boolean) {
    if (line.toLowerCase() === 'sideboard') return { section: 'sideboard', consume: true }
    // MTGO style: blank line before a card line indicates sideboard (implicit, don't consume)
    if (prevBlank) return { section: 'sideboard', consume: false }
    return null
  },
  cardPatterns: [
    {
      pattern: /^(\d+)\s+(.+)$/,
      extract: (m: RegExpMatchArray) => ({
        name: m[2].trim(),
        quantity: parseInt(m[1], 10),
      }),
    },
  ],
}

export const mtgoFormat: DeckExportFormat = {
  id: 'mtgo',
  name: 'MTGO',
  description: 'MTGO format: 4 Lightning Bolt',

  parse(text: string): ParsedCard[] {
    return parseLinesWithSections(text, mtgoConfig)
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = []

    if (deck.format.type === 'commander' && deck.commanders.length > 0) {
      lines.push('Commander')
      deck.commanders.forEach(c => {
        lines.push(`1 ${c.name}`)
      })
      lines.push('')
    }

    getConfirmedCards(deck).forEach(c => {
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
