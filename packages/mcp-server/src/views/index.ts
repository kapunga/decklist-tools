import type { Deck, DeckCard, RoleDefinition, ScryfallCard, CardFilter } from '@mtg-deckbuilder/shared'
import { getPrimaryType, getCardCount, getRoleById, CARD_TYPE_ORDER, migrateDeckNote, enrichCards, applyFilters, getCmcDistribution, countManaPips } from '@mtg-deckbuilder/shared'

export interface ViewDescription {
  id: string
  name: string
  description: string
}

export function getViewDescriptions(): ViewDescription[] {
  return [
    { id: 'full', name: 'Full', description: 'Deck card list. Supports group_by (none/role/type), sort_by (name/set), and filters.' },
    { id: 'curve', name: 'Curve', description: 'Mana curve analysis with CMC distribution, pip counts, and type breakdown' },
    { id: 'notes', name: 'Notes', description: 'Deck notes documenting combos, synergies, and strategy' },
  ]
}

export type DetailLevel = 'summary' | 'compact' | 'full'

export function renderDeckView(
  deck: Deck,
  viewType: string,
  globalRoles: RoleDefinition[],
  sortBy?: string,
  groupBy?: string,
  filters?: CardFilter[],
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel
): string {
  // If filters are provided, apply them to get filtered card IDs
  let filteredCardIds: Set<string> | undefined
  if (filters && filters.length > 0) {
    const cache = scryfallCache || new Map<string, ScryfallCard>()
    const enriched = enrichCards(deck.cards.filter(c => c.inclusion === 'confirmed'), cache)
    const filtered = applyFilters(enriched, filters)
    filteredCardIds = new Set(filtered.map(e => e.deckCard.id))
  }

  switch (viewType) {
    case 'full':
      return renderFullView(deck, globalRoles, sortBy, groupBy, filteredCardIds, scryfallCache, detail)
    case 'curve':
      return renderCurveView(deck, scryfallCache, filteredCardIds)
    case 'notes':
      return renderNotesView(deck, globalRoles)
    default:
      return renderFullView(deck, globalRoles, sortBy, groupBy, filteredCardIds, scryfallCache, detail)
  }
}

function renderFullView(
  deck: Deck,
  globalRoles: RoleDefinition[],
  sortBy?: string,
  groupBy?: string,
  filteredCardIds?: Set<string>,
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: DetailLevel
): string {
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

  // Get confirmed cards, applying filter if present
  let confirmedCards = deck.cards.filter(c => c.inclusion === 'confirmed')
  if (filteredCardIds) {
    confirmedCards = confirmedCards.filter(c => filteredCardIds.has(c.id))
  }

  const consideringCards = filteredCardIds
    ? deck.cards.filter(c => c.inclusion === 'considering' && filteredCardIds.has(c.id))
    : deck.cards.filter(c => c.inclusion === 'considering')

  if (groupBy === 'role') {
    renderByRole(lines, confirmedCards, globalRoles, deck.customRoles)
  } else if (groupBy === 'type') {
    renderByType(lines, confirmedCards)
  } else if (sortBy === 'set') {
    renderChecklist(lines, confirmedCards)
  } else {
    // Default: confirmed/considering sections
    if (confirmedCards.length > 0 || consideringCards.length > 0) {
      lines.push('## Main Deck')
      if (confirmedCards.length > 0) {
        lines.push('### Confirmed')
        for (const c of confirmedCards) {
          lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail))
        }
        lines.push('')
      }
      if (consideringCards.length > 0) {
        lines.push('### Considering')
        for (const c of consideringCards) {
          lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail))
        }
        lines.push('')
      }
    }
  }

  // Alternates (only in default grouping)
  if (!groupBy && sortBy !== 'set') {
    if (deck.alternates.length > 0) {
      lines.push('## Alternates')
      for (const c of deck.alternates) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail))
      }
      lines.push('')
    }

    // Sideboard
    if (deck.sideboard.length > 0) {
      lines.push('## Sideboard')
      for (const c of deck.sideboard) {
        lines.push(formatCardLine(c, globalRoles, deck.customRoles, scryfallCache, detail))
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function renderByRole(
  lines: string[],
  cards: DeckCard[],
  globalRoles: RoleDefinition[],
  customRoles: RoleDefinition[]
): void {
  const byRole = new Map<string, DeckCard[]>()
  const noRole: DeckCard[] = []

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
    const role = getRoleById(roleId, globalRoles, customRoles)
    const roleName = role?.name || roleId
    const count = roleCards.reduce((sum, c) => sum + c.quantity, 0)
    lines.push(`## ${roleName} (${count})`)
    if (role?.description) {
      lines.push(`*${role.description}*`)
    }
    for (const c of roleCards) {
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
}

function renderByType(lines: string[], cards: DeckCard[]): void {
  const byType = new Map<string, DeckCard[]>()

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
      lines.push(`- ${c.quantity}x ${c.card.name}`)
    }
    lines.push('')
  }
}

function renderChecklist(lines: string[], cards: DeckCard[]): void {
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
    const checkbox = card.ownership === 'pulled' ? '[x]' : '[ ]'
    lines.push(`${checkbox} ${card.quantity}x ${card.card.name} #${card.card.collectorNumber}`)
  }
}

function formatCardLine(
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

  // Build the header line
  const headerParts: string[] = []

  if (level === 'full' && cached) {
    // Full: include set/rarity
    const setInfo = `${cached.set.toUpperCase()}#${cached.collector_number}`
    const mana = cached.mana_cost ? `${cached.mana_cost} ` : ''
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${card.card.name} • ${setInfo} • ${cached.rarity} • ${mana}${card.typeLine || cached.type_line}${pt}`)
  } else if (level === 'compact' && cached) {
    // Compact: mana cost + full type line
    const mana = cached.mana_cost ? `${cached.mana_cost} ` : ''
    const pt = cached.power && cached.toughness ? ` ${cached.power}/${cached.toughness}` : ''
    headerParts.push(`- ${card.quantity}x ${card.card.name} • ${mana}${card.typeLine || cached.type_line}${pt}`)
  } else {
    // Summary: mana cost + primary type
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

  // Roles
  if (card.roles.length > 0) {
    const roleNames = card.roles
      .map((r) => {
        const role = getRoleById(r, globalRoles, customRoles)
        return role?.name || r
      })
      .join(', ')
    headerParts.push(`(${roleNames})`)
  }

  // Ownership / pinned
  if (card.ownership === 'need_to_buy') {
    headerParts.push('[NEED TO BUY]')
  } else if (card.ownership === 'pulled') {
    headerParts.push('[PULLED]')
  }

  if (card.isPinned) {
    headerParts.push('[PINNED]')
  }

  const header = headerParts.join(' ')

  // For compact and full, append oracle text
  if ((level === 'compact' || level === 'full') && cached?.oracle_text) {
    const indented = cached.oracle_text.split('\n').map(l => `  ${l}`).join('\n')
    return `${header}\n${indented}`
  }

  return header
}

function renderCurveView(deck: Deck, scryfallCache?: Map<string, ScryfallCard>, filteredCardIds?: Set<string>): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Mana Curve)`)
  lines.push('')

  const confirmedCards = deck.cards.filter((c) => c.inclusion === 'confirmed')
  const activeCards = filteredCardIds
    ? confirmedCards.filter(c => filteredCardIds.has(c.id))
    : confirmedCards

  const cache = scryfallCache || new Map<string, ScryfallCard>()
  const enriched = enrichCards(activeCards, cache)

  // CMC Distribution
  const cmcDist = getCmcDistribution(enriched)
  const hasCmcData = Object.values(cmcDist).some(v => v > 0)

  if (hasCmcData) {
    lines.push('## Mana Curve')
    for (let cmc = 0; cmc <= 7; cmc++) {
      const count = cmcDist[cmc] || 0
      if (count > 0) {
        const label = cmc === 7 ? '7+' : String(cmc)
        const bar = '█'.repeat(Math.min(count, 20))
        lines.push(`${label.padEnd(4)} ${bar} ${count}`)
      }
    }
    lines.push('')
  }

  // Mana Pip Distribution
  const pips = countManaPips(enriched)
  const totalPips = pips.W + pips.U + pips.B + pips.R + pips.G + pips.C
  if (totalPips > 0) {
    lines.push('## Mana Pips')
    const colors = [
      { key: 'W' as const, name: 'White' },
      { key: 'U' as const, name: 'Blue' },
      { key: 'B' as const, name: 'Black' },
      { key: 'R' as const, name: 'Red' },
      { key: 'G' as const, name: 'Green' },
      { key: 'C' as const, name: 'Colorless' },
    ]
    for (const { key, name } of colors) {
      if (pips[key] > 0) {
        lines.push(`- ${name}: ${pips[key]}`)
      }
    }
    lines.push('')
  }

  // Type distribution
  const byType = new Map<string, number>()
  for (const card of activeCards) {
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

  // Card counts
  let landCount = 0
  for (const card of activeCards) {
    if ((card.typeLine || '').toLowerCase().includes('land')) {
      landCount += card.quantity
    }
  }

  lines.push('## Card Counts')
  lines.push(`- Lands: ${landCount}`)
  lines.push(`- Nonlands: ${getCardCount(deck) - landCount - deck.commanders.length}`)
  lines.push(`- Total: ${getCardCount(deck)}/${deck.format.deckSize}`)

  return lines.join('\n')
}

function renderNotesView(deck: Deck, globalRoles: RoleDefinition[]): string {
  const lines: string[] = []
  lines.push(`# ${deck.name} (Notes)`)
  lines.push('')

  const notes = deck.notes.map(n => migrateDeckNote(n))

  if (notes.length === 0) {
    lines.push('*No notes yet*')
    return lines.join('\n')
  }

  for (const note of notes) {
    const typeBadge = `[${note.noteType.toUpperCase()}]`
    lines.push(`## ${typeBadge} ${note.title}`)

    if (note.roleId) {
      const role = getRoleById(note.roleId, globalRoles, deck.customRoles)
      lines.push(`**Role:** ${role?.name || note.roleId}`)
    }

    lines.push('')
    lines.push(note.content)
    lines.push('')

    if (note.cardRefs.length > 0) {
      lines.push('**Cards:**')
      for (const ref of note.cardRefs) {
        lines.push(`  ${ref.ordinal}. ${ref.cardName}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
