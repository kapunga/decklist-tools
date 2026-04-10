import type { Deck, CardEntry } from '../types/index.js'
import { FORMAT_TYPE } from '../types/index.js'
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
          roles.push(tagMatch[1].toLowerCase().replace(/\s+/g, '-'))
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

    const renderCard = (c: CardEntry, category: string) => {
      const roleStr = (c.roles ?? []).map(r => `^${r}^`).join(' ')
      let line = `${c.quantity}x ${c.card.name} (${(c.card.setCode || '???').toUpperCase()}) ${c.card.collectorNumber || '0'} [${category}]`
      if (roleStr) line += ` ${roleStr}`
      lines.push(line)
    }

    const roleToCategoryMap: Record<string, string> = {
      land: 'Lands',
      ramp: 'Ramp',
      'card-draw': 'Card Draw',
      removal: 'Removal',
      'board-wipe': 'Board Wipes',
      protection: 'Protection',
      recursion: 'Recursion',
      finisher: 'Finishers'
    }

    // Commanders section
    if (deck.format.type === FORMAT_TYPE.COMMANDER && deck.commanders.length > 0) {
      deck.commanders.forEach(c => {
        lines.push(`1x ${c.name} (${(c.setCode || '???').toUpperCase()}) ${c.collectorNumber || '0'} [Commander]`)
      })
    }

    getConfirmedCards(deck).forEach(c => {
        // Use first role for category, fallback to 'Other'
        const primaryRole = (c.roles ?? [])[0]
        const category = primaryRole ? (roleToCategoryMap[primaryRole] || 'Other') : 'Other'
        renderCard(c, category)
      })

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
