import type { CardEntry, PrimaryType, ScryfallCard } from '../types/index.js'
import { getCardManaCost, getCardManaValue, isLandPrimaryType, resolvePrimaryType } from '../domain/classification.js'
import { addTallies, emptyManaCostTally, parseManaCost, scaleTally, tallyManaCost } from '../domain/mana-symbols.js'
import type { ManaCostTally, ManaPipCounts } from '../domain/mana-symbols.js'
import type { EnrichedDeckCard, CardFilter } from './types.js'

export type { EnrichedDeckCard, FilterMode, CmcFilter, ColorFilter, CardTypeFilter, RoleFilter, OwnershipFilter, CardFilter, FilterGroup } from './types.js'
export { FILTER_GROUP_TYPES } from './types.js'
export { normalizeFilters, resolveRoleFilters, FilterError } from './normalize.js'

// Get CMC for a card, using Scryfall data if available
function getCardCmc(enriched: EnrichedDeckCard): number {
  return getCardManaValue(enriched.scryfallCard) ?? 0
}

// Primary type via the shared classification (stored primaryType, else front face)
function getEnrichedPrimaryType(enriched: EnrichedDeckCard): PrimaryType {
  return resolvePrimaryType(enriched.deckCard, enriched.scryfallCard)
}

// Get CMC bucket (7+ grouped together)
function getCmcBucket(cmc: number): number {
  return Math.min(Math.floor(cmc), 7)
}

// Get card colors from Scryfall data
function getCardColors(enriched: EnrichedDeckCard): string[] {
  if (enriched.scryfallCard) {
    const colors = enriched.scryfallCard.colors || enriched.scryfallCard.color_identity
    return colors.length === 0 ? ['C'] : colors
  }
  return ['C']
}

// Check if a card is a land
function isLand(enriched: EnrichedDeckCard): boolean {
  return isLandPrimaryType(getEnrichedPrimaryType(enriched))
}

// Apply a single filter to a card
function matchesFilter(card: EnrichedDeckCard, filter: CardFilter): boolean {
  switch (filter.type) {
    case 'cmc': {
      const bucket = getCmcBucket(getCardCmc(card))
      const matches = filter.values.includes(bucket)
      return filter.mode === 'include' ? matches : !matches
    }
    case 'color': {
      const colors = getCardColors(card)
      const matches = filter.values.some(v => colors.includes(v))
      return filter.mode === 'include' ? matches : !matches
    }
    case 'card-type': {
      const primaryType = getEnrichedPrimaryType(card)
      const matches = filter.values.includes(primaryType)
      return filter.mode === 'include' ? matches : !matches
    }
    case 'role': {
      const matches = filter.values.some(v => card.deckCard.roles.includes(v))
      return filter.mode === 'include' ? matches : !matches
    }
    case 'ownership': {
      const matches = filter.values.includes(card.deckCard.ownership)
      return filter.mode === 'include' ? matches : !matches
    }
  }
}

// Apply all filters (AND logic — card must pass all filters)
export function applyFilters(cards: EnrichedDeckCard[], filters: CardFilter[]): EnrichedDeckCard[] {
  if (filters.length === 0) return cards
  return cards.filter(card => filters.every(f => matchesFilter(card, f)))
}

// Pips and generic mana for one nonland card, times its quantity. Lands and
// cards without Scryfall data (no known cost) contribute nothing.
function cardManaTally(card: EnrichedDeckCard): ManaCostTally {
  const manaCost = getCardManaCost(card.scryfallCard)
  if (isLand(card) || manaCost === undefined) return emptyManaCostTally
  return scaleTally(tallyManaCost(parseManaCost(manaCost)), card.deckCard.quantity)
}

// Pip counts and generic mana across non-land cards
export function tallyManaCosts(cards: EnrichedDeckCard[]): ManaCostTally {
  return cards.map(cardManaTally).reduce(addTallies, emptyManaCostTally)
}

// Count mana pips (W/U/B/R/G and real {C}) from mana costs of non-land cards
export function countManaPips(cards: EnrichedDeckCard[]): ManaPipCounts {
  return tallyManaCosts(cards).pips
}

// CMC distribution for bar chart (excludes lands, buckets 7+)
export function getCmcDistribution(cards: EnrichedDeckCard[]): Record<number, number> {
  const dist: Record<number, number> = {}
  for (let i = 0; i <= 7; i++) dist[i] = 0

  for (const card of cards) {
    if (isLand(card)) continue
    // A card with no Scryfall data has an unknown mana value — never count it at 0.
    const manaValue = getCardManaValue(card.scryfallCard)
    if (manaValue === undefined) continue
    const bucket = getCmcBucket(manaValue)
    dist[bucket] = (dist[bucket] || 0) + card.deckCard.quantity
  }

  return dist
}

// Helper to enrich cards with Scryfall data
export function enrichCards(
  cards: CardEntry[],
  cache: Map<string, ScryfallCard>
): EnrichedDeckCard[] {
  return cards.map(deckCard => ({
    deckCard,
    scryfallCard: deckCard.card.scryfallId ? cache.get(deckCard.card.scryfallId) : undefined,
  }))
}
