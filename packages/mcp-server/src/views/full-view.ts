import type { Deck, CardEntry, RoleDefinition, ScryfallCard } from '@mtg-deckbuilder/shared'
import { getPrimaryType, getCardCount, getCardDisplayName, getCanonicalSuffix, buildRoleLookup, CARD_TYPE_ORDER, isCardFullyPulled, getMainboard, getSideboard, getAlternates } from '@mtg-deckbuilder/shared'
import { formatCardLine, type DetailLevel } from './formatters.js'

export function renderFullView(
  deck: Deck,
  globalRoles: RoleDefinition[],
  sortBy?: string,
  groupBy?: string,
  filteredCardIds?: Set<string>,
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel
): string {
  const lines: string[] = []
  const roleLookup = buildRoleLookup(globalRoles, deck.customRoles)

  lines.push(`# ${deck.name}`)
  lines.push('')
  lines.push(`**Format:** ${deck.format.type}`)
  if (deck.archetype) lines.push(`**Archetype:** ${deck.archetype}`)
  if (deck.description) lines.push(`**Description:** ${deck.description}`)
  lines.push(`**Cards:** ${getCardCount(deck)}/${deck.format.deckSize}`)
  lines.push('')

  if (deck.commanders.length > 0) {
    lines.push('## Commander(s)')
    for (const c of deck.commanders) {
      lines.push(`- ${getCardDisplayName(c)}${getCanonicalSuffix(c)} (${c.setCode.toUpperCase()} ${c.collectorNumber})`)
    }
    lines.push('')
  }

  const mainboard = getMainboard(deck)
  let mainboardCards = mainboard
  if (filteredCardIds) {
    mainboardCards = mainboardCards.filter(c => filteredCardIds.has(c.id))
  }

  if (groupBy === 'role') {
    renderByRole(lines, mainboardCards, roleLookup)
  } else if (groupBy === 'type') {
    renderByType(lines, mainboardCards)
  } else if (sortBy === 'set') {
    renderChecklist(lines, mainboardCards)
  } else {
    if (mainboardCards.length > 0) {
      lines.push('## Main Deck')
      for (const c of mainboardCards) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail, roleLookup))
      }
      lines.push('')
    }
  }

  if (!groupBy && sortBy !== 'set') {
    const alternates = getAlternates(deck)
    if (alternates.length > 0) {
      lines.push('## Alternates')
      for (const c of alternates) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail, roleLookup))
      }
      lines.push('')
    }

    const sideboard = getSideboard(deck)
    if (sideboard.length > 0) {
      lines.push('## Sideboard')
      for (const c of sideboard) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail, roleLookup))
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function renderByRole(
  lines: string[],
  cards: CardEntry[],
  roleLookup: Map<string, RoleDefinition>
): void {
  const byRole = new Map<string, CardEntry[]>()
  const noRole: CardEntry[] = []

  for (const card of cards) {
    if (card.roles.length === 0) {
      noRole.push(card)
    } else {
      for (const roleId of card.roles) {
        if (!byRole.has(roleId)) {
          byRole.set(roleId, [])
        }
        byRole.get(roleId)!.push(card)
      }
    }
  }

  const sortedRoles = [...byRole.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  for (const [roleId, roleCards] of sortedRoles) {
    const role = roleLookup.get(roleId)
    const roleName = role?.name || roleId
    const count = roleCards.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## ${roleName} (${count})`)
    if (role?.description) {
      lines.push(`*${role.description}*`)
    }
    for (const c of roleCards) {
      lines.push(`- ${c.quantity}x ${getCardDisplayName(c.card)}${getCanonicalSuffix(c.card)}`)
    }
    lines.push('')
  }

  if (noRole.length > 0) {
    const count = noRole.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## Unassigned (${count})`)
    for (const c of noRole) {
      lines.push(`- ${c.quantity}x ${getCardDisplayName(c.card)}${getCanonicalSuffix(c.card)}`)
    }
  }
}

function renderByType(lines: string[], cards: CardEntry[]): void {
  const byType = new Map<string, CardEntry[]>()

  for (const card of cards) {
    const type = getPrimaryType(card.typeLine || 'Other')
    if (!byType.has(type)) {
      byType.set(type, [])
    }
    byType.get(type)!.push(card)
  }

  const sortedTypes = [...byType.entries()].sort((a, b) => {
    const aIndex = CARD_TYPE_ORDER.indexOf(a[0] as typeof CARD_TYPE_ORDER[number])
    const bIndex = CARD_TYPE_ORDER.indexOf(b[0] as typeof CARD_TYPE_ORDER[number])
    return aIndex - bIndex
  })

  for (const [type, typeCards] of sortedTypes) {
    const count = typeCards.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## ${type} (${count})`)
    const sortedCards = [...typeCards].sort((a, b) => a.card.name.localeCompare(b.card.name))
    for (const c of sortedCards) {
      lines.push(`- ${c.quantity}x ${getCardDisplayName(c.card)}${getCanonicalSuffix(c.card)}`)
    }
    lines.push('')
  }
}

function renderChecklist(lines: string[], cards: CardEntry[]): void {
  const sortedCards = [...cards].sort((a, b) => {
    const setCompare = a.card.setCode.localeCompare(b.card.setCode)
    if (setCompare !== 0) return setCompare
    return a.card.collectorNumber.localeCompare(b.card.collectorNumber, undefined, { numeric: true })
  })

  let currentSet = ''
  for (const card of sortedCards) {
    if (card.card.setCode !== currentSet) {
      if (currentSet) lines.push('')
      currentSet = card.card.setCode
      lines.push(`## ${currentSet.toUpperCase()}`)
    }
    const checkbox = isCardFullyPulled(card) ? '[x]' : '[ ]'
    lines.push(`${checkbox} ${card.quantity}x ${getCardDisplayName(card.card)}${getCanonicalSuffix(card.card)} #${card.card.collectorNumber}`)
  }
}
