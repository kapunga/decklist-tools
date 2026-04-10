import type { Deck, CardEntry, CardSet } from '../types/index.js'
import { CARD_SET } from '../types/index.js'
import type { Migration } from './index.js'

// Legacy shape — what decks looked like before migration 002.
interface LegacyDeckCard {
  id: string
  card: CardEntry['card']
  quantity: number
  inclusion: 'confirmed' | 'considering' | 'cut'
  ownership: CardEntry['ownership']
  roles: string[]
  typeLine?: string
  isPinned: boolean
  notes?: string
  addedAt: string
  addedBy: 'user' | 'import'
  pulledPrintings?: CardEntry['pulledPrintings']
}

// Post-v2 entry shape: identical to the current CardEntry but still carries
// the legacy `inclusion` field. Migration 003 consumes this and routes each
// entry into the appropriate CardSet (`cut`, `alternates`, or its original set).
type PostV2Entry = CardEntry & {
  inclusion?: 'confirmed' | 'considering' | 'cut'
}

/** Convert a single legacy DeckCard to the post-v2 shape (still carries inclusion). */
function legacyCardToEntry(card: LegacyDeckCard): PostV2Entry {
  return {
    id: card.id,
    card: card.card,
    quantity: card.quantity,
    inclusion: card.inclusion,
    ownership: card.ownership,
    roles: card.roles,
    typeLine: card.typeLine,
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
