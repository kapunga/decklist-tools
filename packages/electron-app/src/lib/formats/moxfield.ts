import type { Deck } from '@/types'
import type { DeckFormat, ParsedCard, RenderOptions } from './types'

export const moxfieldFormat: DeckFormat = {
  id: 'moxfield',
  name: 'Moxfield CSV',
  description: 'Moxfield CSV format with headers',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    const lines = text.split('\n')

    // Parse header to find column indices
    const header = lines[0]?.toLowerCase() || ''
    const hasHeader = header.startsWith('count') || header.startsWith('"count"')
    const startIndex = hasHeader ? 1 : 0

    // Find Category column index if it exists
    let categoryIndex = -1
    if (hasHeader) {
      const headerParts = lines[0].split(',').map(p => p.trim().replace(/^"|"$/g, '').toLowerCase())
      categoryIndex = headerParts.indexOf('category')
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      if (parts.length >= 4) {
        const category = categoryIndex >= 0 ? parts[categoryIndex]?.toLowerCase() : ''
        const isCommander = category === 'commander'
        const isSideboard = category === 'sideboard'
        const isMaybeboard = category === 'maybeboard' || category === 'considering'

        cards.push({
          name: parts[1],
          setCode: parts[2].toLowerCase(),
          collectorNumber: parts[3],
          quantity: parseInt(parts[0], 10) || 1,
          isSideboard,
          isMaybeboard,
          isCommander,
          roles: []
        })
      }
    }

    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    const lines: string[] = ['Count,Name,Edition,Collector Number,Foil,Condition,Language,Category']

    // Commanders first for Commander format
    if (deck.format.type === 'commander' && deck.commanders.length > 0) {
      deck.commanders.forEach(c => {
        lines.push(
          `1,${c.name},${c.setCode},${c.collectorNumber},,,English,Commander`
        )
      })
    }

    // Main deck
    deck.cards.filter(c => c.inclusion === 'confirmed').forEach(c => {
      lines.push(
        `${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English,Mainboard`
      )
    })

    // Sideboard
    if (options.includeSideboard && deck.sideboard.length > 0) {
      deck.sideboard.forEach(c => {
        lines.push(
          `${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English,Sideboard`
        )
      })
    }

    // Maybeboard
    if (options.includeMaybeboard) {
      const maybe = [
        ...deck.cards.filter(c => c.inclusion === 'considering'),
        ...deck.alternates
      ]
      maybe.forEach(c => {
        lines.push(
          `${c.quantity},${c.card.name},${c.card.setCode},${c.card.collectorNumber},,,English,Maybeboard`
        )
      })
    }

    return lines.join('\n')
  }
}
