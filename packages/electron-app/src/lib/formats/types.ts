import type { Deck } from '@/types'

export interface ParsedCard {
  name: string
  setCode?: string
  collectorNumber?: string
  quantity: number
  isSideboard: boolean
  isMaybeboard: boolean
  isCommander: boolean
  roles: string[]
}

export interface DeckFormat {
  id: string
  name: string
  description: string
  parse: (text: string) => ParsedCard[]
  render: (deck: Deck, options: RenderOptions) => string
}

export interface RenderOptions {
  includeMaybeboard?: boolean
  includeSideboard?: boolean
}

export interface DetectedFormat {
  format: DeckFormat
  confidence: 'high' | 'low'
}

export const PARSER_SECTION = {
  DECK: 'deck',
  SIDEBOARD: 'sideboard',
  MAYBEBOARD: 'maybeboard',
  COMMANDER: 'commander',
} as const
export type ParserSection = typeof PARSER_SECTION[keyof typeof PARSER_SECTION]
