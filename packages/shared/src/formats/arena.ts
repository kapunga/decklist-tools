import type { Deck } from '../types/index.js'
import { isCommanderLikeFormat } from '../types/index.js'
import type { DeckExportFormat, ParsedCard, RenderOptions } from './types.js'
import { getConfirmedCards, getMaybeboardCards, getSideboardCards, parseLinesWithSections, PARSER_SECTION, consumed, type LineParserConfig } from './utils.js'

const arenaConfig: LineParserConfig = {
  detectSection(line: string) {
    const lower = line.toLowerCase()
    if (lower === PARSER_SECTION.DECK) return consumed(PARSER_SECTION.DECK)
    if (lower === PARSER_SECTION.COMMANDER) return consumed(PARSER_SECTION.COMMANDER)
    if (lower === PARSER_SECTION.SIDEBOARD) return consumed(PARSER_SECTION.SIDEBOARD)
    if (lower === PARSER_SECTION.MAYBEBOARD || lower === 'considering') return consumed(PARSER_SECTION.MAYBEBOARD)
    return null
  },
  cardPatterns: [
    {
      // "1x Card Name (SET) 123" with optional trailing markers like *F*
      pattern: /^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+?)(?:\s+\*[A-Z]\*)*$/,
      extract: (m: RegExpMatchArray) => ({
        name: m[2].trim(),
        setCode: m[3].toLowerCase(),
        collectorNumber: m[4],
        quantity: parseInt(m[1], 10),
      }),
    },
    {
      // "1x Card Name" (no set info)
      pattern: /^(\d+)x?\s+(.+)$/,
      extract: (m: RegExpMatchArray) => ({
        name: m[2].trim(),
        quantity: parseInt(m[1], 10),
      }),
    },
  ],
}

export const arenaFormat: DeckExportFormat = {
  id: 'arena',
  name: 'MTG Arena / Mythic Tools',
  description: 'MTG Arena format: 4 Lightning Bolt (M21) 199 or 1x Card (SET) 123',

  parse(text: string): ParsedCard[] {
    return parseLinesWithSections(text, arenaConfig)
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = []

    // Commander section for Commander format
    if (isCommanderLikeFormat(deck.format.type) && deck.commanders.length > 0) {
      lines.push('Commander')
      deck.commanders.forEach(c => {
        lines.push(
          `1 ${c.name} (${c.setCode.toUpperCase()}) ${c.collectorNumber}`
        )
      })
      lines.push('')
    }

    lines.push('Deck')
    getConfirmedCards(deck).forEach(c => {
        lines.push(
          `${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber}`
        )
      })

    const sideboard = getSideboardCards(deck)
    if (options.includeSideboard && sideboard.length > 0) {
      lines.push('', 'Sideboard')
      sideboard.forEach(c => {
        lines.push(
          `${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber}`
        )
      })
    }

    if (options.includeMaybeboard) {
      const maybe = getMaybeboardCards(deck)
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
