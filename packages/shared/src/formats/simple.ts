import type { Deck } from '../types/index.js'
import { isCommanderLikeFormat } from '../types/index.js'
import type { DeckExportFormat, ParsedCard, RenderOptions } from './types.js'
import { getConfirmedCards, getSideboardCards, parseLinesWithSections, PARSER_SECTION, consumed, type LineParserConfig } from './utils.js'

const simpleConfig: LineParserConfig = {
  detectSection(line: string) {
    if (line.toLowerCase().startsWith(PARSER_SECTION.SIDEBOARD)) return consumed(PARSER_SECTION.SIDEBOARD)
    return null
  },
  cardPatterns: [
    {
      // "4 Lightning Bolt"
      pattern: /^(\d+)\s+(.+)$/,
      extract: (m: RegExpMatchArray) => ({
        name: m[2].trim(),
        quantity: parseInt(m[1], 10),
      }),
    },
    {
      // Bare card name (no quantity) — but skip lines containing "deck"
      pattern: /^([A-Za-z].+)$/,
      extract: (m: RegExpMatchArray) => {
        if (m[1].toLowerCase().includes('deck')) return null
        return { name: m[1].trim(), quantity: 1 }
      },
    },
  ],
}

export const simpleFormat: DeckExportFormat = {
  id: 'simple',
  name: 'Simple Text',
  description: 'Simple format: 4 Lightning Bolt',

  parse(text: string): ParsedCard[] {
    return parseLinesWithSections(text, simpleConfig)
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = []

    if (isCommanderLikeFormat(deck.format.type) && deck.commanders.length > 0) {
      lines.push('Commander:')
      deck.commanders.forEach(c => {
        lines.push(`1 ${c.name}`)
      })
      lines.push('')
    }

    getConfirmedCards(deck).forEach(c => {
        lines.push(`${c.quantity} ${c.card.name}`)
      })

    const sideboard = getSideboardCards(deck)
    if (options.includeSideboard && sideboard.length > 0) {
      lines.push('', 'Sideboard:')
      sideboard.forEach(c => {
        lines.push(`${c.quantity} ${c.card.name}`)
      })
    }

    return lines.join('\n')
  }
}
