import type { Deck, CardEntry } from '../types/index.js'
import type { DeckExportFormat, ParsedCard, RenderOptions } from './types.js'
import { getConfirmedCards, getMaybeboardCards, getSideboardCards } from './utils.js'

// Moxfield's documented deck-import grammar (per moxfield.com/help/creating-decks):
//
//   AMOUNT CARDNAME (SETCODE) NUMBER *F*
//
// where `(SETCODE) NUMBER` and the `*F*` foil indicator are optional. There
// are no section headers — sideboard, maybeboard, and commander placement are
// handled in Moxfield's UI after the paste, not via the text grammar. The
// previous implementation here emitted Moxfield's *collection* CSV format,
// which their deck importer does not accept.

const lineWithSet = /^(\d+)x?\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+?)(?:\s+\*[A-Z]\*)*$/
const lineBare = /^(\d+)x?\s+(.+)$/

function renderCard(c: CardEntry): string {
  if (c.card.setCode && c.card.collectorNumber) {
    return `${c.quantity} ${c.card.name} (${c.card.setCode.toUpperCase()}) ${c.card.collectorNumber}`
  }
  return `${c.quantity} ${c.card.name}`
}

export const moxfieldFormat: DeckExportFormat = {
  id: 'moxfield',
  name: 'Moxfield',
  description: 'Moxfield deck-import grammar: AMOUNT CARDNAME (SETCODE) NUMBER, sections set in UI',

  parse(text: string): ParsedCard[] {
    const cards: ParsedCard[] = []
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('//') || line.startsWith('#')) continue

      const withSet = line.match(lineWithSet)
      if (withSet) {
        cards.push({
          name: withSet[2].trim(),
          setCode: withSet[3].toLowerCase(),
          collectorNumber: withSet[4],
          quantity: parseInt(withSet[1], 10),
          isSideboard: false,
          isMaybeboard: false,
          isCommander: false,
          roles: [],
        })
        continue
      }

      const bare = line.match(lineBare)
      if (bare) {
        cards.push({
          name: bare[2].trim(),
          quantity: parseInt(bare[1], 10),
          isSideboard: false,
          isMaybeboard: false,
          isCommander: false,
          roles: [],
        })
      }
    }
    return cards
  },

  render(deck: Deck, options: RenderOptions): string {
    // Moxfield's UI imports each section (mainboard / sideboard / maybeboard)
    // into a separate paste box, so the renderer is section-scoped rather than
    // emitting the full deck at once. The ExportDropdown surfaces one menu
    // item per non-empty section.
    //
    // Behaviour by `section`:
    //   'mainboard'  → commanders + mainboard cards (commanders included so the
    //                  user can promote one in Moxfield's deck-creation modal)
    //   'sideboard'  → sideboard cards only
    //   'maybeboard' → alternates / maybeboard cards only
    //   undefined    → all sections concatenated (legacy callers, MCP tool).
    const section = options.section
    const lines: string[] = []

    if (!section || section === 'mainboard') {
      deck.commanders.forEach(c => {
        if (c.setCode && c.collectorNumber) {
          lines.push(`1 ${c.name} (${c.setCode.toUpperCase()}) ${c.collectorNumber}`)
        } else {
          lines.push(`1 ${c.name}`)
        }
      })
      getConfirmedCards(deck).forEach(c => lines.push(renderCard(c)))
    }

    if ((!section || section === 'sideboard') && (options.includeSideboard ?? true)) {
      getSideboardCards(deck).forEach(c => lines.push(renderCard(c)))
    }

    if ((!section || section === 'maybeboard') && (options.includeMaybeboard ?? true)) {
      getMaybeboardCards(deck).forEach(c => lines.push(renderCard(c)))
    }

    return lines.join('\n')
  },
}
