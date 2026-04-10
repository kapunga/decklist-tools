import type { Deck, CardEntry } from '../types/index.js'
import { getMainboard, getAlternates, getSideboard } from '../domain/card-sets.js'
import type { ParsedCard, LineParserConfig, ParserSection } from './types.js'
import { PARSER_SECTION } from './types.js'

export { PARSER_SECTION, consumed, implicit } from './types.js'
export type { ParserSection, ExtractedCard, SectionResult, LineParserConfig } from './types.js'

export function prepareLines(text: string): string[] {
  return text.split('\n').map(l => l.trim())
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

// Format-parser-friendly aliases. After the inclusion → CardSet refactor,
// "confirmed" is simply the mainboard, "maybeboard" is the alternates set,
// and "sideboard" is the sideboard set.
export function getConfirmedCards(deck: Deck): CardEntry[] {
  return getMainboard(deck)
}

export function getMaybeboardCards(deck: Deck): CardEntry[] {
  return getAlternates(deck)
}

export function getSideboardCards(deck: Deck): CardEntry[] {
  return getSideboard(deck)
}
