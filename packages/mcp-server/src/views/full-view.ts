import type { Deck, CardEntry, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getCardCount, buildRoleLookup, getCommanderEntries, getMainboard, getSideboard, getAlternates } from '@mtg-deckbuilder/shared'
import { formatCardLine, formatMissingDataWarning, unresolvedAmong, countCopies, type DetailLevel } from './formatters.js'
import { selectGrouping, selectOrder, sortEntries, type CardGroup, type EntryOrder, type Grouping } from './groupings.js'

// --- deck_list ---
// Every section (Commander(s), Main Deck, Alternates, Sideboard) goes through
// the same pipeline: filter → sort → group → render. Every card goes through
// one `CardLine` built on `formatCardLine`, whatever the grouping.

/** A titled deck section and the entries it lists. */
interface DeckSection {
  title: string
  entries: CardEntry[]
  /** Copies in the section before filtering; set only when a filter narrowed it. */
  totalCopies?: number
}

type CardLine = (entry: CardEntry) => string

export function renderFullView(
  deck: Deck,
  globalRoles: RoleDefinition[],
  sortBy?: string,
  groupBy?: string,
  filteredCardIds?: Set<string>,
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel,
  unresolved: CardEntry[] = []
): string {
  const cache = scryfallCache ?? new Map<string, ScryfallCard>()
  const roleLookup = buildRoleLookup(globalRoles, deck.customRoles)
  const commanders: DeckSection = { title: 'Commander(s)', entries: getCommanderEntries(deck) }
  const sections = deckSections(deck).map(s => filterSection(s, filteredCardIds))
  const missing = unresolvedAmong(unresolved, [commanders, ...sections].flatMap(s => s.entries))
  const missingIds = new Set(missing.map(c => c.id))
  const cardLine: CardLine = c =>
    formatCardLine(c, globalRoles, deck.customRoles, cache, detail, roleLookup, missingIds.has(c.id))
  const order = selectOrder(sortBy)
  const grouping = selectGrouping(groupBy, sortBy, cache, roleLookup)

  return [
    ...renderDeckHeader(deck),
    ...(filteredCardIds ? [FILTER_NOTE, ''] : []),
    ...formatMissingDataWarning(missing),
    ...renderSection(commanders, order, undefined, cardLine),
    ...sections.flatMap(s => renderSection(s, order, grouping, cardLine)),
  ].join('\n')
}

const FILTER_NOTE = '*Filters applied to every section; sections with no matching cards are omitted.*'

/** The card-set sections, in display order. */
function deckSections(deck: Deck): DeckSection[] {
  return [
    { title: 'Main Deck', entries: getMainboard(deck) },
    { title: 'Alternates', entries: getAlternates(deck) },
    { title: 'Sideboard', entries: getSideboard(deck) },
  ]
}

/** Keep only matching entries, remembering the unfiltered copy count. No filter leaves the section as is. */
function filterSection(section: DeckSection, filteredCardIds: Set<string> | undefined): DeckSection {
  if (!filteredCardIds) return section
  return {
    ...section,
    entries: section.entries.filter(e => filteredCardIds.has(e.id)),
    totalCopies: countCopies(section.entries),
  }
}

function renderDeckHeader(deck: Deck): string[] {
  return [
    `# ${deck.name}`,
    '',
    `**Format:** ${deck.format.type}`,
    ...(deck.archetype ? [`**Archetype:** ${deck.archetype}`] : []),
    ...(deck.description ? [`**Description:** ${deck.description}`] : []),
    `**Cards:** ${getCardCount(deck)}/${deck.format.deckSize}`,
    '',
  ]
}

/** A counted section heading followed by its cards, sorted then flat or grouped. Empty sections render nothing. */
function renderSection(section: DeckSection, order: EntryOrder, grouping: Grouping | undefined, cardLine: CardLine): string[] {
  if (section.entries.length === 0) return []
  const sorted = sortEntries(section.entries, order)
  const body = grouping
    ? grouping(sorted).flatMap(g => renderGroup(g, cardLine))
    : [...sorted.map(cardLine), '']
  return [sectionHeading(section), ...body]
}

/** `## Main Deck (60)`, or `## Main Deck (12 of 60)` when a filter narrowed the section. */
function sectionHeading(section: DeckSection): string {
  const shown = countCopies(section.entries)
  const count = section.totalCopies === undefined ? `${shown}` : `${shown} of ${section.totalCopies}`
  return `## ${section.title} (${count})`
}

function renderGroup(group: CardGroup, cardLine: CardLine): string[] {
  return [
    `### ${group.heading} (${countCopies(group.entries)})`,
    ...(group.description ? [`*${group.description}*`] : []),
    ...group.entries.map(cardLine),
    '',
  ]
}
