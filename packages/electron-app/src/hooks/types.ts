import type { ParsedCard, DetectedFormat } from '@mtg-deckbuilder/shared'
import type { CardEntry, CardSetName, PulledPrinting, PullListItem as BasePullListItem, PullListGroup as BasePullListGroup } from '@/types'

export interface ImportProgress {
  current: number
  total: number
}

export interface ResolvedCard {
  card: CardEntry
  listType: CardSetName
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

// Pull list hook types — extends shared base with UI-specific identity fields

export interface PullListItem extends BasePullListItem {
  deckCardId: string
  scryfallId: string
}

export interface PullListGroup extends Omit<BasePullListGroup, 'items'> {
  items: PullListItem[]
}

// Identify mode — flat per-card view for marking specific printings
export interface IdentifyItem {
  deckCardId: string
  cardName: string
  quantityNeeded: number
  quantityPulledTotal: number
  remainingNeeded: number
  currentPrintings: PulledPrinting[]
}
