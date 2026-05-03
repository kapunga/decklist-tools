import type { Deck, CardEntry } from '../types/index.js'
import { isCommanderLikeFormat } from '../types/index.js'
import { PARSER_SECTION } from './utils.js'
import type { DeckExportFormat, ParsedCard, RenderOptions } from './types.js'
import { prepareLines, getConfirmedCards, getMaybeboardCards, getSideboardCards } from './utils.js'

export const archidektFormat: DeckExportFormat = {
  id: 'archidekt',
  name: 'Archidekt',
  description: 'Archidekt format: 1x Card Name (SET) 123 [Category] ^tag^',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    const lines = prepareLines(text)

    const cardPattern = /^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)\s*(?:\[([^\]]+)\])?\s*(.*)$/
    const tagPattern = /\^([^^]+)\^/g

    for (const line of lines) {
      if (!line) continue

      const match = line.match(cardPattern)
      if (match) {
        const tagStr = match[6] || ''
        const roles: string[] = []
        let tagMatch
        while ((tagMatch = tagPattern.exec(tagStr)) !== null) {
          // Archidekt color tags are `LabelName,#RRGGBB` — drop the color when present.
          const label = tagMatch[1].split(',')[0]
          roles.push(label.toLowerCase().replace(/\s+/g, '-'))
        }

        const category = match[5]?.toLowerCase()
        const isCommander = category === PARSER_SECTION.COMMANDER

        // Add land role if in Lands category
        if ((category === 'lands' || category === 'land') && !roles.includes('land')) {
          roles.push('land')
        }

        cards.push({
          name: match[2].trim(),
          setCode: match[3].toLowerCase(),
          collectorNumber: match[4],
          quantity: parseInt(match[1], 10),
          isSideboard: category === PARSER_SECTION.SIDEBOARD,
          isMaybeboard: category === PARSER_SECTION.MAYBEBOARD || category === 'considering',
          isCommander,
          roles
        })
      }
    }

    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = []

    // Role tags are intentionally not emitted on Archidekt export. Archidekt's
    // parser appears to greedy-match the first `^` to the last `^` on a line,
    // which breaks any card with more than one tag. Their own native exports
    // don't carry tags either — organizational intent flows through Archidekt's
    // own category vocabulary, which we don't yet map onto. Tag alignment
    // across deckbuilders is tracked in a separate ticket.
    const renderCard = (c: CardEntry, structuralCategory?: string) => {
      let line = `${c.quantity}x ${c.card.name} (${(c.card.setCode || '???').toUpperCase()}) ${c.card.collectorNumber || '0'}`
      if (structuralCategory) line += ` [${structuralCategory}]`
      lines.push(line)
    }

    // Commanders section — `[Commander]` is structural (Archidekt uses it to
    // identify the deck's commander), so we keep the bracket here.
    if (isCommanderLikeFormat(deck.format.type) && deck.commanders.length > 0) {
      deck.commanders.forEach(c => {
        lines.push(`1x ${c.name} (${(c.setCode || '???').toUpperCase()}) ${c.collectorNumber || '0'} [Commander]`)
      })
    }

    getConfirmedCards(deck).forEach(c => renderCard(c))

    const sideboard = getSideboardCards(deck)
    if (options.includeSideboard && sideboard.length > 0) {
      sideboard.forEach(c => renderCard(c, 'Sideboard'))
    }

    if (options.includeMaybeboard) {
      getMaybeboardCards(deck).forEach(c => renderCard(c, 'Maybeboard'))
    }

    return lines.join('\n')
  }
}
