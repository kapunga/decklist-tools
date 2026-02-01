import type { Deck, RoleDefinition, ScryfallCard, CardFilter } from '@mtg-deckbuilder/shared'
import { enrichCards, applyFilters } from '@mtg-deckbuilder/shared'
import { renderFullView } from './full-view.js'
import { renderCurveView } from './curve-view.js'
import { renderNotesView } from './notes-view.js'
import type { DetailLevel } from './formatters.js'

export type { DetailLevel }

export interface ViewDescription {
  id: string
  name: string
  description: string
}

export function getViewDescriptions(): ViewDescription[] {
  return [
    { id: 'full', name: 'Full', description: 'Deck card list. Supports group_by (none/role/type), sort_by (name/set), and filters.' },
    { id: 'curve', name: 'Curve', description: 'Mana curve analysis with CMC distribution, pip counts, and type breakdown' },
    { id: 'notes', name: 'Notes', description: 'Deck notes documenting combos, synergies, and strategy' },
  ]
}

export function renderDeckView(
  deck: Deck,
  viewType: string,
  globalRoles: RoleDefinition[],
  sortBy?: string,
  groupBy?: string,
  filters?: CardFilter[],
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel
): string {
  // If filters are provided, apply them to get filtered card IDs
  let filteredCardIds: Set<string> | undefined
  if (filters && filters.length > 0) {
    const cache = scryfallCache || new Map<string, ScryfallCard>()
    const enriched = enrichCards(deck.cards.filter(c => c.inclusion === 'confirmed'), cache)
    const filtered = applyFilters(enriched, filters)
    filteredCardIds = new Set(filtered.map(e => e.deckCard.id))
  }

  switch (viewType) {
    case 'full':
      return renderFullView(deck, globalRoles, sortBy, groupBy, filteredCardIds, scryfallCache, detail)
    case 'curve':
      return renderCurveView(deck, scryfallCache, filteredCardIds)
    case 'notes':
      return renderNotesView(deck, globalRoles)
    default:
      return renderFullView(deck, globalRoles, sortBy, groupBy, filteredCardIds, scryfallCache, detail)
  }
}
