import {
  Storage,
  type Deck,
  type CardEntry,
  type CardSet,
  type CardFilter,
  type FormatType,
  createEmptyDeck,
  formatDefaults,
  getCardCount,
  type ScryfallCard,
  validateDeckStructure,
  getSideboard,
  getAllDeckEntries,
  isValidUUID,
  enrichCards,
  applyFilters,
  getMainboard,
} from '@mtg-deckbuilder/shared'
import {
  renderFullView,
  renderCurveView,
  renderNotesView,
  renderPullListView,
} from '../views/index.js'
import type {
  GetDeckDetail,
  ManageDeckArgs,
  DeckListArgs,
  DeckCurveArgs,
  DeckNotesArgs,
  DeckPullListArgs,
} from './types.js'

export function listDecks(storage: Storage) {
  const decks = storage.listDecks()
  return decks.map((d) => ({
    id: d.id,
    name: d.name,
    format: d.format.type,
    cardCount: getCardCount(d),
    commanders: d.commanders.map((c) => c.name),
    updatedAt: d.updatedAt,
  }))
}

// Fields stripped from each CardEntry in `summary` mode. These are only
// needed for surgical edit operations — an LLM doing deck analysis doesn't
// care about per-entry UUIDs, timestamps, where the card came from, or
// which printings have been physically pulled for collection tracking.
function summarizeEntry(entry: CardEntry): Partial<CardEntry> {
  const { id: _id, addedAt: _addedAt, source: _source, pulledPrintings: _pulled, ...rest } = entry
  return rest
}

function summarizeCardSets(cardSets: CardSet[]): CardSet[] {
  return cardSets.map(set => ({
    ...set,
    entries: set.entries.map(summarizeEntry) as CardEntry[],
  }))
}

export function getDeck(storage: Storage, identifier: string, detail: GetDeckDetail = 'summary') {
  const deck = isValidUUID(identifier)
    ? storage.getDeck(identifier)
    : storage.getDeckByName(identifier)

  if (!deck) {
    throw new Error(`Deck not found: ${identifier}`)
  }

  const validation = validateDeck(deck)

  if (detail === 'full') {
    return { ...deck, validation }
  }

  return {
    ...deck,
    cardSets: summarizeCardSets(deck.cardSets),
    validation,
  }
}

function validateDeck(deck: Deck) {
  const validationIssues = validateDeckStructure(deck)
  const cardCount = getCardCount(deck)
  const sideboardCount = getSideboard(deck).reduce((sum, c) => sum + c.quantity, 0)

  return {
    valid: validationIssues.length === 0,
    issues: validationIssues.map(i => i.message),
    summary: {
      cardCount,
      deckSize: deck.format.deckSize,
      sideboardCount,
      sideboardSize: deck.format.sideboardSize,
      commanders: deck.commanders.map((c) => c.name),
    },
  }
}

export function manageDeck(storage: Storage, args: ManageDeckArgs) {
  switch (args.action) {
    case 'create': {
      if (!args.name) throw new Error('name is required for create')
      if (!args.format) throw new Error('format is required for create')
      const formatType = args.format as FormatType
      if (!formatDefaults[formatType]) {
        throw new Error(`Invalid format: ${args.format}`)
      }
      const deck = createEmptyDeck(args.name, formatType)
      if (args.archetype) deck.archetype = args.archetype
      if (args.description) deck.description = args.description
      storage.saveDeck(deck)
      return { id: deck.id, name: deck.name, format: deck.format.type }
    }
    case 'update': {
      if (!args.deck_id) throw new Error('deck_id is required for update')
      const deck = storage.getDeck(args.deck_id)
      if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)
      if (args.name !== undefined) deck.name = args.name
      if (args.description !== undefined) deck.description = args.description
      if (args.archetype !== undefined) deck.archetype = args.archetype
      storage.saveDeck(deck)
      return { success: true, deck: { id: deck.id, name: deck.name } }
    }
    case 'delete': {
      if (!args.deck_id) throw new Error('deck_id is required for delete')
      const success = storage.deleteDeck(args.deck_id)
      if (!success) throw new Error(`Deck not found: ${args.deck_id}`)
      return { success: true, message: `Deck ${args.deck_id} deleted` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

// Shared helper: load Scryfall cache for every entry in a deck. Used by
// deck_list and deck_curve (deck_notes doesn't need it; deck_pull_list builds
// its own fetch via the set collection).
function loadScryfallCache(storage: Storage, deck: Deck): Map<string, ScryfallCard> {
  const cache = new Map<string, ScryfallCard>()
  for (const entry of getAllDeckEntries(deck)) {
    if (entry.card.scryfallId) {
      const cached = storage.getCachedCard(entry.card.scryfallId) as ScryfallCard | null
      if (cached) cache.set(entry.card.scryfallId, cached)
    }
  }
  return cache
}

// Shared helper: build the set of card entry IDs that match a filter list.
// Returns undefined when no filters are supplied — the render functions treat
// undefined as "no filter" rather than "empty set".
function buildFilteredCardIds(
  deck: Deck,
  scryfallCache: Map<string, ScryfallCard>,
  filters: CardFilter[] | undefined,
): Set<string> | undefined {
  if (!filters || filters.length === 0) return undefined
  const enriched = enrichCards(getMainboard(deck), scryfallCache)
  const filtered = applyFilters(enriched, filters)
  return new Set(filtered.map(e => e.deckCard.id))
}

function getDeckOrThrow(storage: Storage, deckId: string): Deck {
  const deck = storage.getDeck(deckId)
  if (!deck) throw new Error(`Deck not found: ${deckId}`)
  return deck
}

export function deckList(storage: Storage, args: DeckListArgs): string {
  const deck = getDeckOrThrow(storage, args.deck_id)
  const globalRoles = storage.getGlobalRoles()
  const scryfallCache = loadScryfallCache(storage, deck)
  const filteredCardIds = buildFilteredCardIds(deck, scryfallCache, args.filters)
  // Default to `compact` — the whole point of the split is that oracle text
  // is the first-look content an LLM wants for deck analysis.
  const detail = args.detail ?? 'compact'
  return renderFullView(deck, globalRoles, args.sort_by, args.group_by, filteredCardIds, scryfallCache, detail)
}

export function deckCurve(storage: Storage, args: DeckCurveArgs): string {
  const deck = getDeckOrThrow(storage, args.deck_id)
  const scryfallCache = loadScryfallCache(storage, deck)
  const filteredCardIds = buildFilteredCardIds(deck, scryfallCache, args.filters)
  return renderCurveView(deck, scryfallCache, filteredCardIds)
}

export function deckNotes(storage: Storage, args: DeckNotesArgs): string {
  const deck = getDeckOrThrow(storage, args.deck_id)
  const globalRoles = storage.getGlobalRoles()
  // No Scryfall cache needed — notes don't reference card oracle data.
  return renderNotesView(deck, globalRoles)
}

export function deckPullList(storage: Storage, args: DeckPullListArgs): string {
  const deck = getDeckOrThrow(storage, args.deck_id)
  const scryfallCache = loadScryfallCache(storage, deck)
  const setCollection = storage.getSetCollection() ?? { version: 1, updatedAt: '', sets: [] }
  return renderPullListView(deck, setCollection, scryfallCache, { showPulled: true })
}

export function searchDecksForCard(storage: Storage, cardName: string) {
  const decks = storage.listDecks()
  const results: { deckId: string; deckName: string; location: string; quantity: number }[] = []

  for (const deck of decks) {
    for (const set of deck.cardSets) {
      for (const card of set.entries) {
        if (card.card.name.toLowerCase().includes(cardName.toLowerCase())) {
          results.push({
            deckId: deck.id,
            deckName: deck.name,
            location: set.name,
            quantity: card.quantity,
          })
        }
      }
    }

    for (const commander of deck.commanders) {
      if (commander.name.toLowerCase().includes(cardName.toLowerCase())) {
        results.push({
          deckId: deck.id,
          deckName: deck.name,
          location: 'commander',
          quantity: 1,
        })
      }
    }
  }

  return results
}
