import type { Deck, CardEntry, CardSet } from '../types/index.js'
import { CARD_SET } from '../types/index.js'
import type { Migration } from './index.js'

// Legacy shape — what decks looked like before migration 002.
interface LegacyDeckCard {
  id: string
  card: CardEntry['card']
  quantity: number
  inclusion: CardEntry['inclusion']
  ownership: CardEntry['ownership']
  roles: string[]
  typeLine?: string
  isPinned: boolean
  notes?: string
  addedAt: string
  addedBy: 'user' | 'import'
  pulledPrintings?: CardEntry['pulledPrintings']
}

/** Convert a single legacy DeckCard to the unified CardEntry shape. */
function legacyCardToEntry(card: LegacyDeckCard): CardEntry {
  return {
    id: card.id,
    card: card.card,
    quantity: card.quantity,
    inclusion: card.inclusion,
    ownership: card.ownership,
    roles: card.roles,
    typeLine: card.typeLine,
    isPinned: card.isPinned,
    notes: card.notes,
    addedAt: card.addedAt,
    source: card.addedBy,
    pulledPrintings: card.pulledPrintings,
  }
}

/**
 * Migration 002: Convert deck.cards / deck.sideboard / deck.alternates
 * into a unified cardSets: CardSet[] structure, and DeckCard → CardEntry.
 * Maps `addedBy` → `source`.
 */
export const migrateCardSets: Migration = {
  version: 2,
  name: 'card-sets',
  migrate(deck: Deck) {
    const legacy = deck as unknown as {
      cards?: LegacyDeckCard[]
      sideboard?: LegacyDeckCard[]
      alternates?: LegacyDeckCard[]
      cardSets?: CardSet[]
    }

    // Idempotency — if already migrated, do nothing.
    if (legacy.cardSets) return

    const cardSets: CardSet[] = [
      { name: CARD_SET.MAINBOARD, entries: (legacy.cards ?? []).map(legacyCardToEntry) },
      { name: CARD_SET.SIDEBOARD, entries: (legacy.sideboard ?? []).map(legacyCardToEntry) },
      { name: CARD_SET.ALTERNATES, entries: (legacy.alternates ?? []).map(legacyCardToEntry) },
    ]

    legacy.cardSets = cardSets
    delete legacy.cards
    delete legacy.sideboard
    delete legacy.alternates
  },
}
