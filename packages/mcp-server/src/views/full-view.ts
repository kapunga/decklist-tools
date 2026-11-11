import type { Deck, CardEntry, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getCardCount, buildRoleLookup, getCommanderEntries, getMainboard, getSideboard, getAlternates } from '@mtg-deckbuilder/shared'
import { formatCardLine, formatMissingDataWarning, unresolvedAmong, countCopies, type DetailLevel } from './formatters.js'
import { selectGrouping, type CardGroup, type Grouping } from './groupings.js'

// --- deck_list ---
// Every section (Commander(s), Main Deck, Alternates, Sideboard) goes through
// `renderSection`, and every card through one `CardLine` built on
// `formatCardLine`, whatever the grouping. Groupings only partition entries.

/** A titled deck section and the entries it lists. */
interface DeckSection {
  title: string
  entries: CardEntry[]
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
  const sections = deckSections(deck, filteredCardIds)
  const missing = unresolvedAmong(unresolved, [commanders, ...sections].flatMap(s => s.entries))
  const missingIds = new Set(missing.map(c => c.id))
  const cardLine: CardLine = c =>
    formatCardLine(c, globalRoles, deck.customRoles, cache, detail, roleLookup, missingIds.has(c.id))
  const grouping = selectGrouping(groupBy, sortBy, cache, roleLookup)

  return [
    ...renderDeckHeader(deck),
    ...formatMissingDataWarning(missing),
    ...renderSection(commanders, undefined, cardLine),
    ...sections.flatMap(s => renderSection(s, grouping, cardLine)),
  ].join('\n')
}

/** The card-set sections, in display order. Filters currently narrow the Main Deck only. */
function deckSections(deck: Deck, filteredCardIds?: Set<string>): DeckSection[] {
  const keep = (e: CardEntry) => !filteredCardIds || filteredCardIds.has(e.id)
  return [
    { title: 'Main Deck', entries: getMainboard(deck).filter(keep) },
    { title: 'Alternates', entries: getAlternates(deck) },
    { title: 'Sideboard', entries: getSideboard(deck) },
  ]
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

/** A section heading followed by its cards, flat or grouped. Empty sections render nothing. */
function renderSection(section: DeckSection, grouping: Grouping | undefined, cardLine: CardLine): string[] {
  if (section.entries.length === 0) return []
  const body = grouping
    ? grouping(section.entries).flatMap(g => renderGroup(g, cardLine))
    : [...section.entries.map(cardLine), '']
  return [`## ${section.title}`, ...body]
}

function renderGroup(group: CardGroup, cardLine: CardLine): string[] {
  return [
    `### ${group.heading} (${countCopies(group.entries)})`,
    ...(group.description ? [`*${group.description}*`] : []),
    ...group.entries.map(cardLine),
    '',
  ]
}
