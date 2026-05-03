import type { Deck } from '../types/index.js'

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

export interface DeckExportFormat {
  id: string
  name: string
  description: string
  parse: (text: string) => ParsedCard[]
  render: (deck: Deck, options: RenderOptions) => string
}

export interface RenderOptions {
  includeMaybeboard?: boolean
  includeSideboard?: boolean
  // When set, emit only the named section. Used for tools (e.g. Moxfield) whose
  // import UI accepts each section into a separate paste box. When omitted,
  // the renderer emits the whole deck (existing behavior).
  section?: 'mainboard' | 'sideboard' | 'maybeboard'
}

export interface DetectedFormat {
  format: DeckExportFormat
  confidence: 'high' | 'low'
}

// Section state for line-based parsers — these represent external format sections, not internal data model names
export const PARSER_SECTION = {
  DECK: 'deck',
  SIDEBOARD: 'sideboard',
  MAYBEBOARD: 'maybeboard',
  COMMANDER: 'commander',
} as const
export type ParserSection = typeof PARSER_SECTION[keyof typeof PARSER_SECTION]

// A card extraction result without section flags (those come from the parser loop)
export interface ExtractedCard {
  name: string
  setCode?: string
  collectorNumber?: string
  quantity: number
  roles?: string[]
}

// A section detection result. 'consume' means the line is a header (skip card matching).
// 'implicit' means section changed but the line should still be parsed as a card.
export type SectionResult =
  | { section: ParserSection; consume: boolean }
  | 'skip'
  | null

// Helpers for building SectionResult values
export const consumed = (section: ParserSection): SectionResult => ({ section, consume: true })
export const implicit = (section: ParserSection): SectionResult => ({ section, consume: false })

// Configuration for the shared line-based parser
export interface LineParserConfig {
  // Given a line, return a section transition or null to keep current section.
  // Return 'skip' to skip the line entirely.
  // Return { section, consume: true } for section headers (line won't be parsed as card).
  // Return { section, consume: false } for implicit transitions (line will still be parsed).
  detectSection: (line: string, prevBlank: boolean) => SectionResult

  // Card patterns tried in order; first match wins. Return null to skip the line.
  cardPatterns: Array<{
    pattern: RegExp
    extract: (match: RegExpMatchArray) => ExtractedCard | null
  }>
}
