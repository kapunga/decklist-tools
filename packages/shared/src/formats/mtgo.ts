import type { Deck } from '../types/index.js'
import { FORMAT_TYPE } from '../types/index.js'
import type { DeckExportFormat, ParsedCard, RenderOptions } from './types.js'
import { getConfirmedCards, parseLinesWithSections, PARSER_SECTION, consumed, implicit, type LineParserConfig } from './utils.js'

const mtgoConfig: LineParserConfig = {
  detectSection(line: string, prevBlank: boolean) {
    if (line.toLowerCase() === PARSER_SECTION.SIDEBOARD) return consumed(PARSER_SECTION.SIDEBOARD)
    if (prevBlank) return implicit(PARSER_SECTION.SIDEBOARD)
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

    if (deck.format.type === FORMAT_TYPE.COMMANDER && deck.commanders.length > 0) {
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
