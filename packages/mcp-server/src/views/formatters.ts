import type { CardEntry, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getEntryPrimaryType, getRoleById, isCardFullyPulled, getOracleText, getCardDisplayName, getCanonicalSuffix, OWNERSHIP_STATUS, getTypeLine, getCachedCard, getCardManaCost } from '@mtg-deckbuilder/shared'

export type DetailLevel = 'summary' | 'compact' | 'full'

// --- Missing Scryfall data ---
// Views receive the entries the tool handler could not resolve (after trying
// to fetch them) and must say so rather than render guessed values.

const NO_DATA_MARKER = '[no Scryfall data]'
const MAX_NAMED_CARDS = 25

/** The unresolved entries that a view actually renders (matched by entry id). */
export function unresolvedAmong(unresolved: CardEntry[], rendered: CardEntry[]): CardEntry[] {
  const renderedIds = new Set(rendered.map(e => e.id))
  return unresolved.filter(e => renderedIds.has(e.id))
}

/** Total copies across entries. */
export function countCopies(entries: CardEntry[]): number {
  return entries.reduce((sum, e) => sum + e.quantity, 0)
}

/** `1 card` / `4 cards`. */
export function pluralizeCards(count: number): string {
  return `${count} ${count === 1 ? 'card' : 'cards'}`
}

function nameList(entries: CardEntry[]): string {
  const names = [...new Set(entries.map(e => getCardDisplayName(e.card)))]
  const shown = names.slice(0, MAX_NAMED_CARDS)
  const more = names.length > shown.length ? `, and ${names.length - shown.length} more` : ''
  return `${shown.join(', ')}${more}`
}

/**
 * Warning block naming entries with no Scryfall data, followed by a blank
 * line. Empty when every entry is resolved.
 */
export function formatMissingDataWarning(unresolved: CardEntry[]): string[] {
  if (unresolved.length === 0) return []
  const count = pluralizeCards(countCopies(unresolved))
  return [
    `> **Warning:** ${count} without Scryfall data (not cached and could not be fetched); their oracle text, mana value and mana pips are missing: ${nameList(unresolved)}.`,
    '',
  ]
}

export function formatCardLine(
  card: CardEntry,
  globalRoles: RoleDefinition[],
  customRoles: RoleDefinition[],
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel,
  roleLookup?: Map<string, RoleDefinition>,
  missingData = false
): string {
  const level = detail || 'summary'
  const cache = scryfallCache || new Map<string, ScryfallCard>()
  const cached = getCachedCard(card, cache)
  const typeLine = getTypeLine(card, cache)
  const manaCost = getCardManaCost(cached)
  const mana = manaCost ? `${manaCost} ` : ''

  const displayName = getCardDisplayName(card.card)
  const canonicalSuffix = getCanonicalSuffix(card.card)
  const headerParts: string[] = []

  if (level === 'full' && cached) {
    const setInfo = `${cached.set.toUpperCase()}#${cached.collector_number}`
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix} • ${setInfo} • ${cached.rarity} • ${mana}${typeLine ?? ''}${pt}`)
  } else if (level === 'compact' && cached) {
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix} • ${mana}${typeLine ?? ''}${pt}`)
  } else {
    if (manaCost) {
      headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix} • ${manaCost}`)
    } else {
      headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix}`)
    }
    if (typeLine || card.primaryType) {
      headerParts.push(`[${getEntryPrimaryType(card, cache)}]`)
    }
    if (missingData) headerParts.push(NO_DATA_MARKER)
  }

  if (card.roles.length > 0) {
    const roleNames = card.roles
      .map((r) => {
        const role = roleLookup ? roleLookup.get(r) : getRoleById(r, globalRoles, customRoles)
        return role?.name || r
      })
      .join(', ')
    headerParts.push(`(${roleNames})`)
  }

  if (card.ownership === OWNERSHIP_STATUS.NEED_TO_BUY) {
    headerParts.push('[NEED TO BUY]')
  } else if (isCardFullyPulled(card)) {
    headerParts.push('[PULLED]')
  }

  const header = headerParts.join(' ')

  if ((level === 'compact' || level === 'full') && cached) {
    const oracleText = getOracleText(cached)
    if (oracleText) {
      const indented = oracleText.split('\n').map(l => `  ${l}`).join('\n')
      return `${header}\n${indented}`
    }
  }

  return header
}
