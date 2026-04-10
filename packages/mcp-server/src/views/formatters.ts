import type { CardEntry, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getPrimaryType, getRoleById, isCardFullyPulled, getOracleText, getCardDisplayName, getCanonicalSuffix, OWNERSHIP_STATUS } from '@mtg-deckbuilder/shared'

export type DetailLevel = 'summary' | 'compact' | 'full'

export function formatCardLine(
  card: CardEntry,
  globalRoles: RoleDefinition[],
  customRoles: RoleDefinition[],
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel,
  roleLookup?: Map<string, RoleDefinition>
): string {
  const level = detail || 'summary'
  const cached = scryfallCache && card.card.scryfallId
    ? scryfallCache.get(card.card.scryfallId)
    : undefined

  const displayName = getCardDisplayName(card.card)
  const canonicalSuffix = getCanonicalSuffix(card.card)
  const headerParts: string[] = []

  if (level === 'full' && cached) {
    const setInfo = `${cached.set.toUpperCase()}#${cached.collector_number}`
    const mana = cached.mana_cost ? `${cached.mana_cost} ` : ''
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix} • ${setInfo} • ${cached.rarity} • ${mana}${card.typeLine || cached.type_line}${pt}`)
  } else if (level === 'compact' && cached) {
    const mana = cached.mana_cost ? `${cached.mana_cost} ` : ''
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix} • ${mana}${card.typeLine || cached.type_line}${pt}`)
  } else {
    const manaCost = cached?.mana_cost
    if (manaCost) {
      headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix} • ${manaCost}`)
    } else {
      headerParts.push(`- ${card.quantity}x ${displayName}${canonicalSuffix}`)
    }
    if (card.typeLine) {
      headerParts.push(`[${getPrimaryType(card.typeLine)}]`)
    }
  }

  const cardRoles = card.roles ?? []
  if (cardRoles.length > 0) {
    const roleNames = cardRoles
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
