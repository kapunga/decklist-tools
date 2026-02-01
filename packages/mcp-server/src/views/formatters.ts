import type { DeckCard, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getPrimaryType, getRoleById } from '@mtg-deckbuilder/shared'

export type DetailLevel = 'summary' | 'compact' | 'full'

export function formatCardLine(
  card: DeckCard,
  globalRoles: RoleDefinition[],
  customRoles: RoleDefinition[],
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel
): string {
  const level = detail || 'summary'
  const cached = scryfallCache && card.card.scryfallId
    ? scryfallCache.get(card.card.scryfallId)
    : undefined

  const headerParts: string[] = []

  if (level === 'full' && cached) {
    const setInfo = `${cached.set.toUpperCase()}#${cached.collector_number}`
    const mana = cached.mana_cost ? `${cached.mana_cost} ` : ''
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${card.card.name} • ${setInfo} • ${cached.rarity} • ${mana}${card.typeLine || cached.type_line}${pt}`)
  } else if (level === 'compact' && cached) {
    const mana = cached.mana_cost ? `${cached.mana_cost} ` : ''
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${card.card.name} • ${mana}${card.typeLine || cached.type_line}${pt}`)
  } else {
    const manaCost = cached?.mana_cost
    if (manaCost) {
      headerParts.push(`- ${card.quantity}x ${card.card.name} • ${manaCost}`)
    } else {
      headerParts.push(`- ${card.quantity}x ${card.card.name}`)
    }
    if (card.typeLine) {
      headerParts.push(`[${getPrimaryType(card.typeLine)}]`)
    }
  }

  if (card.roles.length > 0) {
    const roleNames = card.roles
      .map((r) => {
        const role = getRoleById(r, globalRoles, customRoles)
        return role?.name || r
      })
      .join(', ')
    headerParts.push(`(${roleNames})`)
  }

  if (card.ownership === 'need_to_buy') {
    headerParts.push('[NEED TO BUY]')
  } else if (card.ownership === 'pulled') {
    headerParts.push('[PULLED]')
  }

  if (card.isPinned) {
    headerParts.push('[PINNED]')
  }

  const header = headerParts.join(' ')

  if ((level === 'compact' || level === 'full') && cached?.oracle_text) {
    const indented = cached.oracle_text.split('\n').map(l => `  ${l}`).join('\n')
    return `${header}\n${indented}`
  }

  return header
}
