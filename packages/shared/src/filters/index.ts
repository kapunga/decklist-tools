import type { DeckCard, ScryfallCard } from '../types/index.js'
import { getPrimaryType } from '../constants/index.js'

// Enriched card pairs a DeckCard with optional Scryfall data
export interface EnrichedDeckCard {
  deckCard: DeckCard
  scryfallCard?: ScryfallCard
}

// Filter mode
export type FilterMode = 'include' | 'exclude'

// Filter types
export interface CmcFilter {
  type: 'cmc'
  mode: FilterMode
  values: number[] // 0-7, where 7 means 7+
}

export interface ColorFilter {
  type: 'color'
  mode: FilterMode
  values: string[] // W, U, B, R, G, C
}

export interface CardTypeFilter {
  type: 'card-type'
  mode: FilterMode
  values: string[] // Creature, Instant, etc.
}

export interface RoleFilter {
  type: 'role'
  mode: FilterMode
  values: string[] // role IDs
}

export type CardFilter = CmcFilter | ColorFilter | CardTypeFilter | RoleFilter

// Filter groups determine which filter types are available
export type FilterGroup = 'mana' | 'type' | 'role'

export const FILTER_GROUP_TYPES: Record<FilterGroup, CardFilter['type'][]> = {
  mana: ['cmc', 'color'],
  type: ['card-type'],
  role: ['role'],
}

// Get CMC for a card, using Scryfall data if available
function getCardCmc(enriched: EnrichedDeckCard): number {
  if (enriched.scryfallCard) {
    return enriched.scryfallCard.cmc
  }
  return 0
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
  const typeLine = enriched.scryfallCard?.type_line || enriched.deckCard.typeLine || ''
  return typeLine.toLowerCase().includes('land')
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
      const typeLine = card.scryfallCard?.type_line || card.deckCard.typeLine || 'Other'
      const primaryType = getPrimaryType(typeLine)
      const matches = filter.values.includes(primaryType)
      return filter.mode === 'include' ? matches : !matches
    }
    case 'role': {
      const matches = filter.values.some(v => card.deckCard.roles.includes(v))
      return filter.mode === 'include' ? matches : !matches
    }
  }
}

// Apply all filters (AND logic — card must pass all filters)
export function applyFilters(cards: EnrichedDeckCard[], filters: CardFilter[]): EnrichedDeckCard[] {
  if (filters.length === 0) return cards
  return cards.filter(card => filters.every(f => matchesFilter(card, f)))
}

// Mana pip counts for pie chart
export interface ManaPipCounts {
  W: number
  U: number
  B: number
  R: number
  G: number
  C: number
}

// Count mana pips from mana costs of non-land cards
export function countManaPips(cards: EnrichedDeckCard[]): ManaPipCounts {
  const counts: ManaPipCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }

  for (const card of cards) {
    if (isLand(card)) continue
    const sc = card.scryfallCard
    if (!sc) continue

    const manaCost = sc.mana_cost || ''
    // Handle DFCs — only count front face
    const qty = card.deckCard.quantity

    // Count colored pips
    for (const ch of manaCost) {
      if (ch === 'W') counts.W += qty
      else if (ch === 'U') counts.U += qty
      else if (ch === 'B') counts.B += qty
      else if (ch === 'R') counts.R += qty
      else if (ch === 'G') counts.G += qty
    }

    // Count generic/colorless mana as C pips
    const genericMatch = manaCost.match(/\{(\d+)\}/g)
    if (genericMatch) {
      for (const m of genericMatch) {
        const num = parseInt(m.slice(1, -1), 10)
        counts.C += num * qty
      }
    }
  }

  return counts
}

// CMC distribution for bar chart (excludes lands, buckets 7+)
export function getCmcDistribution(cards: EnrichedDeckCard[]): Record<number, number> {
  const dist: Record<number, number> = {}
  for (let i = 0; i <= 7; i++) dist[i] = 0

  for (const card of cards) {
    if (isLand(card)) continue
    const bucket = getCmcBucket(getCardCmc(card))
    dist[bucket] = (dist[bucket] || 0) + card.deckCard.quantity
  }

  return dist
}

// Helper to enrich cards with Scryfall data
export function enrichCards(
  cards: DeckCard[],
  cache: Map<string, ScryfallCard>
): EnrichedDeckCard[] {
  return cards.map(deckCard => ({
    deckCard,
    scryfallCard: deckCard.card.scryfallId ? cache.get(deckCard.card.scryfallId) : undefined,
  }))
}
