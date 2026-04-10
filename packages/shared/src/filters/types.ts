import type { CardEntry, ScryfallCard } from '../types/index.js'

// Enriched card pairs a CardEntry with optional Scryfall data
export interface EnrichedDeckCard {
  deckCard: CardEntry
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

export interface OwnershipFilter {
  type: 'ownership'
  mode: FilterMode
  values: string[] // unknown, owned, pulled, need_to_buy
}

export type CardFilter = CmcFilter | ColorFilter | CardTypeFilter | RoleFilter | OwnershipFilter

// Filter groups determine which filter types are available
export type FilterGroup = 'mana' | 'type' | 'role' | 'status'

export const FILTER_GROUP_TYPES: Record<FilterGroup, CardFilter['type'][]> = {
  mana: ['cmc', 'color'],
  type: ['card-type'],
  role: ['role'],
  status: ['ownership'],
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
