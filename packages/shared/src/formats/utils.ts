import type { Deck, DeckCard } from '../types/index.js'
import { INCLUSION_STATUS } from '../types/index.js'
import type { ParsedCard } from './types.js'

export function prepareLines(text: string): string[] {
  return text.split('\n').map(l => l.trim())
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
interface ExtractedCard {
  name: string
  setCode?: string
  collectorNumber?: string
  quantity: number
  roles?: string[]
}

// A section detection result. 'consume' means the line is a header (skip card matching).
// 'implicit' means section changed but the line should still be parsed as a card.
type SectionResult =
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

// Shared parse loop for line-based format parsers (Arena, MTGO, Simple).
// Handles line preparation, section tracking, and card extraction.
export function parseLinesWithSections(text: string, config: LineParserConfig): ParsedCard[] {
  const cards: ParsedCard[] = []
  const lines = prepareLines(text)

  let section: ParserSection = PARSER_SECTION.DECK
  let prevBlank = false

  for (const line of lines) {
    if (!line) {
      prevBlank = true
      continue
    }

    const result = config.detectSection(line, prevBlank)
    prevBlank = false

    if (result === 'skip') continue
    if (result !== null) {
      section = result.section
      if (result.consume) continue
    }

    for (const { pattern, extract } of config.cardPatterns) {
      const match = line.match(pattern)
      if (match) {
        const extracted = extract(match)
        if (extracted) {
          cards.push({
            ...extracted,
            roles: extracted.roles || [],
            isSideboard: section === PARSER_SECTION.SIDEBOARD,
            isMaybeboard: section === PARSER_SECTION.MAYBEBOARD,
            isCommander: section === PARSER_SECTION.COMMANDER,
          })
        }
        break
      }
    }
  }

  return cards
}

export function getConfirmedCards(deck: Deck): DeckCard[] {
  return deck.cards.filter(c => c.inclusion === INCLUSION_STATUS.CONFIRMED)
}

export function getMaybeboardCards(deck: Deck): DeckCard[] {
  return [
    ...deck.cards.filter(c => c.inclusion === INCLUSION_STATUS.CONSIDERING),
    ...deck.alternates
  ]
}
