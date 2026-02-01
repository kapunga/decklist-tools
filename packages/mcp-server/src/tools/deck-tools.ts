import {
  Storage,
  type Deck,
  type FormatType,
  createEmptyDeck,
  formatDefaults,
  getCardLimit,
  getCardCount,
  type ScryfallCard,
} from '@mtg-deckbuilder/shared'
import { renderDeckView } from '../views/index.js'
import type { ManageDeckArgs, ViewDeckArgs } from './types.js'

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

export function getDeck(storage: Storage, identifier: string) {
  // Try by ID first
  let deck = storage.getDeck(identifier)
  if (!deck) {
    // Try by name
    deck = storage.getDeckByName(identifier)
  }
  if (!deck) {
    throw new Error(`Deck not found: ${identifier}`)
  }

  const validation = validateDeck(deck)

  return {
    ...deck,
    validation,
  }
}

function validateDeck(deck: Deck) {
  const issues: string[] = []
  const format = deck.format

  const cardCount = getCardCount(deck)
  if (cardCount < format.deckSize) {
    issues.push(`Deck has ${cardCount} cards, needs ${format.deckSize}`)
  } else if (cardCount > format.deckSize && format.type === 'commander') {
    issues.push(`Commander deck has ${cardCount} cards, should be exactly ${format.deckSize}`)
  }

  const sideboardCount = deck.sideboard.reduce((sum, c) => sum + c.quantity, 0)
  if (sideboardCount > format.sideboardSize) {
    issues.push(`Sideboard has ${sideboardCount} cards, max is ${format.sideboardSize}`)
  }

  const cardCounts = new Map<string, number>()
  for (const card of deck.cards) {
    const current = cardCounts.get(card.card.name) || 0
    cardCounts.set(card.card.name, current + card.quantity)
  }

  for (const [name, count] of cardCounts) {
    const limit = getCardLimit(name, format)
    if (count > limit && limit !== Infinity) {
      issues.push(`${name}: ${count} copies (limit: ${limit})`)
    }
  }

  if (format.type === 'commander' && deck.commanders.length === 0) {
    issues.push('No commander set for Commander format deck')
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      cardCount,
      deckSize: format.deckSize,
      sideboardCount,
      sideboardSize: format.sideboardSize,
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

export function viewDeck(storage: Storage, args: ViewDeckArgs) {
  const deck = storage.getDeck(args.deck_id)
  if (!deck) throw new Error(`Deck not found: ${args.deck_id}`)

  const globalRoles = storage.getGlobalRoles()

  const scryfallCache = new Map<string, ScryfallCard>()
  const allCards = [...deck.cards, ...deck.alternates, ...deck.sideboard]
  for (const card of allCards) {
    if (card.card.scryfallId) {
      const cached = storage.getCachedCard(card.card.scryfallId) as ScryfallCard | null
      if (cached) scryfallCache.set(card.card.scryfallId, cached)
    }
  }

  return renderDeckView(deck, args.view || 'full', globalRoles, args.sort_by, args.group_by, args.filters, scryfallCache, args.detail)
}

export function searchDecksForCard(storage: Storage, cardName: string) {
  const decks = storage.listDecks()
  const results: { deckId: string; deckName: string; location: string; quantity: number }[] = []

  for (const deck of decks) {
    const lists: [string, { card: { name: string }; quantity: number }[]][] = [
      ['mainboard', deck.cards],
      ['alternates', deck.alternates],
      ['sideboard', deck.sideboard],
    ]

    for (const [location, list] of lists) {
      for (const card of list) {
        if (card.card.name.toLowerCase().includes(cardName.toLowerCase())) {
          results.push({
            deckId: deck.id,
            deckName: deck.name,
            location,
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
