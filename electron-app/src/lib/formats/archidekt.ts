import type { Deck, DeckCard } from '@/types'
import type { DeckFormat, ParsedCard, RenderOptions } from './types'

export const archidektFormat: DeckFormat = {
  id: 'archidekt',
  name: 'Archidekt',
  description: 'Archidekt format: 1x Card Name (SET) 123 [Category] ^tag^',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    const lines = text.split('\n').map(l => l.trim())

    const cardPattern = /^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)\s*(?:\[([^\]]+)\])?\s*(.*)$/
    const tagPattern = /\^([^^]+)\^/g

    for (const line of lines) {
      if (!line) continue

      const match = line.match(cardPattern)
      if (match) {
        const tagStr = match[6] || ''
        const tags: string[] = []
        let tagMatch
        while ((tagMatch = tagPattern.exec(tagStr)) !== null) {
          tags.push(tagMatch[1])
        }

        const category = match[5]?.toLowerCase()
        let role: string | undefined
        if (category === 'commander') role = 'commander'
        else if (category === 'lands' || category === 'land') role = 'land'

        cards.push({
          name: match[2].trim(),
          setCode: match[3].toLowerCase(),
          collectorNumber: match[4],
          quantity: parseInt(match[1], 10),
          isSideboard: category === 'sideboard',
          isMaybeboard: category === 'maybeboard' || category === 'considering',
          role,
          tags
        })
      }
    }

    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = []

    const renderCard = (c: DeckCard, category: string) => {
      const tagStr = c.tags.map(t => `^${t}^`).join(' ')
      let line = `${c.quantity}x ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber} [${category}]`
      if (tagStr) line += ` ${tagStr}`
      lines.push(line)
    }

    const roleToCategory: Record<string, string> = {
      commander: 'Commander',
      land: 'Lands',
      core: 'Core',
      enabler: 'Enablers',
      support: 'Support',
      flex: 'Flex'
    }

    deck.cards
      .filter(c => c.inclusion === 'confirmed')
      .forEach(c => {
        renderCard(c, roleToCategory[c.role] || 'Other')
      })

    if (options.includeSideboard && deck.sideboard.length > 0) {
      deck.sideboard.forEach(c => renderCard(c, 'Sideboard'))
    }

    if (options.includeMaybeboard) {
      const maybe = [
        ...deck.cards.filter(c => c.inclusion === 'considering'),
        ...deck.alternates
      ]
      maybe.forEach(c => renderCard(c, 'Maybeboard'))
    }

    return lines.join('\n')
  }
}
