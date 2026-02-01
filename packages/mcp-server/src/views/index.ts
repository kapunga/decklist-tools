import type { Deck, DeckCard, RoleDefinition } from '@mtg-deckbuilder/shared'
import { getPrimaryType, getCardCount, getRoleById, CARD_TYPE_ORDER } from '@mtg-deckbuilder/shared'

export interface ViewDescription {
  id: string
  name: string
  description: string
}

export function getViewDescriptions(): ViewDescription[] {
  return [
    { id: 'full', name: 'Full', description: 'Complete deck with all metadata' },
    { id: 'skeleton', name: 'Skeleton', description: 'Minimal view grouped by role' },
    { id: 'checklist', name: 'Checklist', description: 'Sorted for pulling cards' },
    { id: 'curve', name: 'Curve', description: 'Mana curve analysis' },
    { id: 'buy-list', name: 'Buy List', description: 'Only cards marked need_to_buy' },
    { id: 'by-role', name: 'By Role', description: 'Grouped by role' },
    { id: 'by-type', name: 'By Type', description: 'Grouped by card type' },
  ]
}

export function renderDeckView(
  deck: Deck,
  viewType: string,
  globalRoles: RoleDefinition[],
  _sortBy?: string,
  _groupBy?: string
): string {
  switch (viewType) {
    case 'full':
      return renderFullView(deck, globalRoles)
    case 'skeleton':
      return renderSkeletonView(deck, globalRoles)
    case 'checklist':
      return renderChecklistView(deck)
    case 'curve':
      return renderCurveView(deck)
    case 'buy-list':
      return renderBuyListView(deck)
    case 'by-role':
      return renderByRoleView(deck, globalRoles)
    case 'by-type':
      return renderByTypeView(deck)
    default:
      return renderFullView(deck, globalRoles)
  }
}

function renderFullView(deck: Deck, globalRoles: RoleDefinition[]): string {
  const lines: string[] = []

  lines.push(`# ${deck.name}`)
  lines.push('')
  lines.push(`**Format:** ${deck.format.type}`)
  if (deck.archetype) lines.push(`**Archetype:** ${deck.archetype}`)
  if (deck.description) lines.push(`**Description:** ${deck.description}`)
  lines.push(`**Cards:** ${getCardCount(deck)}/${deck.format.deckSize}`)
  lines.push('')

  // Commanders
  if (deck.commanders.length > 0) {
    lines.push('## Commander(s)')
    for (const c of deck.commanders) {
      lines.push(`- ${c.name} (${c.setCode.toUpperCase()} ${c.collectorNumber})`)
    }
    lines.push('')
  }

  // Main deck
  if (deck.cards.length > 0) {
    lines.push('## Main Deck')
    const confirmedCards = deck.cards.filter((c) => c.inclusion === 'confirmed')
    const consideringCards = deck.cards.filter((c) => c.inclusion === 'considering')

    if (confirmedCards.length > 0) {
      lines.push('### Confirmed')
      for (const c of confirmedCards) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles))
      }
      lines.push('')
    }

    if (consideringCards.length > 0) {
      lines.push('### Considering')
      for (const c of consideringCards) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles))
      }
      lines.push('')
    }
  }

  // Alternates
  if (deck.alternates.length > 0) {
    lines.push('## Alternates')
    for (const c of deck.alternates) {
      lines.push(formatCardLine(c, globalRoles, deck.customRoles))
    }
    lines.push('')
  }

  // Sideboard
  if (deck.sideboard.length > 0) {
    lines.push('## Sideboard')
    for (const c of deck.sideboard) {
      lines.push(formatCardLine(c, globalRoles, deck.customRoles))
    }
    lines.push('')
  }

  return lines.join('\n')
}

function formatCardLine(
  card: DeckCard,
  globalRoles: RoleDefinition[],
  customRoles: RoleDefinition[]
): string {
  const parts: string[] = []
  parts.push(`- ${card.quantity}x ${card.card.name}`)

  if (card.typeLine) {
    parts.push(`[${getPrimaryType(card.typeLine)}]`)
  }

  if (card.roles.length > 0) {
    const roleNames = card.roles
      .map((r) => {
        const role = getRoleById(r, globalRoles, customRoles)
        return role?.name || r
      })
      .join(', ')
    parts.push(`(${roleNames})`)
  }

  if (card.ownership === 'need_to_buy') {
    parts.push('[NEED TO BUY]')
  } else if (card.ownership === 'pulled') {
    parts.push('[PULLED]')
  }

  if (card.isPinned) {
    parts.push('[PINNED]')
  }

  return parts.join(' ')
}

function renderSkeletonView(deck: Deck, globalRoles: RoleDefinition[]): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Skeleton View)`)
  lines.push('')
  lines.push(`Cards: ${getCardCount(deck)}/${deck.format.deckSize}`)
  lines.push('')

  // Group by role
  const byRole = new Map<string, DeckCard[]>()
  const noRole: DeckCard[] = []

  for (const card of deck.cards.filter((c) => c.inclusion === 'confirmed')) {
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

  // Sort roles and output
  const sortedRoles = [...byRole.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  for (const [roleId, cards] of sortedRoles) {
    const role = getRoleById(roleId, globalRoles, deck.customRoles)
    const roleName = role?.name || roleId
    const count = cards.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`**${roleName}** (${count})`)
    for (const c of cards) {
      lines.push(`  ${c.quantity}x ${c.card.name}`)
    }
    lines.push('')
  }

  if (noRole.length > 0) {
    const count = noRole.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`**Untagged** (${count})`)
    for (const c of noRole) {
      lines.push(`  ${c.quantity}x ${c.card.name}`)
    }
  }

  return lines.join('\n')
}

function renderChecklistView(deck: Deck): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Checklist)`)
  lines.push('')

  // Sort by set code, then collector number for efficient pulling
  const confirmedCards = deck.cards.filter((c) => c.inclusion === 'confirmed')
  const sortedCards = [...confirmedCards].sort((a, b) => {
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
    const checkbox = card.ownership === 'pulled' ? '[x]' : '[ ]'
    lines.push(`${checkbox} ${card.quantity}x ${card.card.name} #${card.card.collectorNumber}`)
  }

  return lines.join('\n')
}

function renderCurveView(deck: Deck): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Mana Curve)`)
  lines.push('')

  // Group non-land cards by CMC
  const byCmc = new Map<number, DeckCard[]>()
  let landCount = 0

  for (const card of deck.cards.filter((c) => c.inclusion === 'confirmed')) {
    const typeLine = card.typeLine || ''
    if (typeLine.toLowerCase().includes('land')) {
      landCount += card.quantity
    } else {
      // Extract CMC from card (we don't have it stored, so we'll estimate from type)
      // In a real implementation, we'd have CMC stored
      const cmc = 0 // Placeholder
      if (!byCmc.has(cmc)) {
        byCmc.set(cmc, [])
      }
      byCmc.get(cmc)!.push(card)
    }
  }

  // Type distribution
  const byType = new Map<string, number>()
  for (const card of deck.cards.filter((c) => c.inclusion === 'confirmed')) {
    const type = getPrimaryType(card.typeLine || 'Unknown')
    byType.set(type, (byType.get(type) || 0) + card.quantity)
  }

  lines.push('## Type Distribution')
  for (const type of CARD_TYPE_ORDER) {
    const count = byType.get(type) || 0
    if (count > 0) {
      const bar = '█'.repeat(Math.min(count, 20))
      lines.push(`${type.padEnd(12)} ${bar} ${count}`)
    }
  }
  lines.push('')

  lines.push('## Card Counts')
  lines.push(`- Lands: ${landCount}`)
  lines.push(`- Nonlands: ${getCardCount(deck) - landCount - deck.commanders.length}`)
  lines.push(`- Total: ${getCardCount(deck)}/${deck.format.deckSize}`)

  return lines.join('\n')
}

function renderBuyListView(deck: Deck): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Buy List)`)
  lines.push('')

  const needToBuy = [
    ...deck.cards.filter((c) => c.ownership === 'need_to_buy'),
    ...deck.sideboard.filter((c) => c.ownership === 'need_to_buy'),
  ]

  if (needToBuy.length === 0) {
    lines.push('*No cards marked as "need to buy"*')
    return lines.join('\n')
  }

  const sorted = [...needToBuy].sort((a, b) => a.card.name.localeCompare(b.card.name))

  for (const card of sorted) {
    lines.push(`- ${card.quantity}x ${card.card.name} (${card.card.setCode.toUpperCase()} ${card.card.collectorNumber})`)
  }

  lines.push('')
  lines.push(`**Total cards to buy:** ${needToBuy.reduce((sum, c) => sum + c.quantity, 0)}`)

  return lines.join('\n')
}

function renderByRoleView(deck: Deck, globalRoles: RoleDefinition[]): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (By Role)`)
  lines.push('')

  const byRole = new Map<string, DeckCard[]>()
  const noRole: DeckCard[] = []

  for (const card of deck.cards.filter((c) => c.inclusion === 'confirmed')) {
    if (card.roles.length === 0) {
      noRole.push(card)
    } else {
      // Add card to each role it belongs to
      for (const roleId of card.roles) {
        if (!byRole.has(roleId)) {
          byRole.set(roleId, [])
        }
        byRole.get(roleId)!.push(card)
      }
    }
  }

  const sortedRoles = [...byRole.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  for (const [roleId, cards] of sortedRoles) {
    const role = getRoleById(roleId, globalRoles, deck.customRoles)
    const roleName = role?.name || roleId
    const count = cards.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## ${roleName} (${count})`)
    if (role?.description) {
      lines.push(`*${role.description}*`)
    }
    for (const c of cards) {
      lines.push(`- ${c.quantity}x ${c.card.name}`)
    }
    lines.push('')
  }

  if (noRole.length > 0) {
    const count = noRole.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## Unassigned (${count})`)
    for (const c of noRole) {
      lines.push(`- ${c.quantity}x ${c.card.name}`)
    }
  }

  return lines.join('\n')
}

function renderByTypeView(deck: Deck): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (By Type)`)
  lines.push('')

  const byType = new Map<string, DeckCard[]>()

  for (const card of deck.cards.filter((c) => c.inclusion === 'confirmed')) {
    const type = getPrimaryType(card.typeLine || 'Other')
    if (!byType.has(type)) {
      byType.set(type, [])
    }
    byType.get(type)!.push(card)
  }

  // Sort by CARD_TYPE_ORDER
  const sortedTypes = [...byType.entries()].sort((a, b) => {
    const aIndex = CARD_TYPE_ORDER.indexOf(a[0] as typeof CARD_TYPE_ORDER[number])
    const bIndex = CARD_TYPE_ORDER.indexOf(b[0] as typeof CARD_TYPE_ORDER[number])
    return aIndex - bIndex
  })

  for (const [type, cards] of sortedTypes) {
    const count = cards.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## ${type} (${count})`)
    const sortedCards = [...cards].sort((a, b) => a.card.name.localeCompare(b.card.name))
    for (const c of sortedCards) {
      lines.push(`- ${c.quantity}x ${c.card.name}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
