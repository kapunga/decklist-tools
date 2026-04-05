import type { ParsedCard, DetectedFormat } from '@/lib/formats'
import type { DeckCard, DeckListName } from '@/types'

// Import hook types

export interface ImportProgress {
  current: number
  total: number
}

export interface ResolvedCard {
  card: DeckCard
  listType: DeckListName
}

export interface UseImportCardsResult {
  // State
  text: string
  formatId: string
  parsedCards: ParsedCard[]
  isImporting: boolean
  importProgress: ImportProgress
  errors: string[]

  // Derived values
  mainDeckCount: number
  sideboardCount: number
  maybeboardCount: number
  detectedFormat: DetectedFormat | null
  totalCardCount: number

  // Actions
  setText: (value: string) => void
  setFormatId: (value: string) => void
  handleTextChange: (value: string) => void
  handleFormatChange: (value: string) => void
  lookupCards: () => Promise<{ resolvedCards: ResolvedCard[]; errors: string[] }>
  reset: () => void
}

// Pull list hook types

export interface PullListItem {
  deckCardId: string
  cardName: string
  setCode: string
  setName: string
  collectorNumber: string
  rarity: string
  typeLine: string
  manaCost: string
  cmc: number
  quantityNeeded: number
  quantityPulledThisPrint: number
  quantityPulledTotal: number
  remainingNeeded: number
  scryfallId: string
}

export interface PullListGroup {
  setCode: string
  setName: string
  items: PullListItem[]
}
