import type { Deck } from '@/types'
import type { DeckFormat, ParsedCard, RenderOptions } from './types'

export const moxfieldFormat: DeckFormat = {
  id: 'moxfield',
  name: 'Moxfield CSV',
  description: 'Moxfield CSV format with headers',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    const lines = text.split('\n')

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().startsWith('count') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      if (parts.length >= 4) {
        cards.push({
          name: parts[1],
          setCode: parts[2].toLowerCase(),
          collectorNumber: parts[3],
          quantity: parseInt(parts[0], 10) || 1,
          isSideboard: false,
          isMaybeboard: false,
          tags: []
        })
      }
    }

    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = ['Count,Name,Edition,Collector Number,Foil,Condition,Language']

    const allCards = [
      ...deck.cards.filter(c => c.inclusion === 'confirmed'),
      ...(options.includeSideboard ? deck.sideboard : []),
      ...(options.includeMaybeboard
        ? [...deck.cards.filter(c => c.inclusion === 'considering'), ...deck.alternates]
        : [])
    ]

    allCards.forEach(c => {
      lines.push(
        `${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English`
      )
    })

    return lines.join('\n')
  }
}
