import type { Deck, CardEntry, SetCollectionFile, ScryfallCard, CollectionLevel, PullListItem, PullListGroup } from '@mtg-deckbuilder/shared'
import { getTotalPulledQuantity, getCardDisplayName, COLLECTION_LEVEL_RARITIES, isBasicLand, OWNERSHIP_STATUS, CARD_SOURCE, getMainboard, getSideboard, getAlternates, getPulledPrintings } from '@mtg-deckbuilder/shared'

// Rarity order for sorting
const RARITY_ORDER: Record<string, number> = {
  'mythic': 0,
  'rare': 1,
  'uncommon': 2,
  'common': 3,
}

// Check if a rarity is included at a collection level
function isRarityAvailable(rarity: string, collectionLevel: CollectionLevel): boolean {
  const allowedRarities = COLLECTION_LEVEL_RARITIES[collectionLevel]
  return allowedRarities.includes(rarity.toLowerCase())
}

export function renderPullListView(
  deck: Deck,
  setCollection: SetCollectionFile,
  scryfallCache: Map<string, ScryfallCard>,
  options?: { showPulled?: boolean; hideBasicLands?: boolean; source?: 'mainDeck' | 'maybeboard' }
): string {
  const lines: string[] = []
  const showPulled = options?.showPulled ?? true
  const hideBasicLands = options?.hideBasicLands ?? true
  const source = options?.source ?? 'mainDeck'

  const sourceLabel = source === 'maybeboard' ? 'Maybeboard' : 'Main Deck'
  lines.push(`# ${deck.name} - Pull List (${sourceLabel})`)
  lines.push('')

  let confirmedCards: CardEntry[]

  if (source === 'maybeboard') {
    // Maybeboard: only the alternates set, no commanders
    let alternateCards = getAlternates(deck)
    if (hideBasicLands) {
      alternateCards = alternateCards.filter(c => !isBasicLand(c.card.name))
    }
    confirmedCards = alternateCards
  } else {
    // Main Deck: main + sideboard + commanders
    let mainCards = getMainboard(deck)
    let sideboardCards = getSideboard(deck)
    if (hideBasicLands) {
      mainCards = mainCards.filter(c => !isBasicLand(c.card.name))
      sideboardCards = sideboardCards.filter(c => !isBasicLand(c.card.name))
    }

    confirmedCards = [
      ...mainCards,
      ...sideboardCards,
      ...deck.commanders.map(cmd => ({
        id: `commander-${cmd.name}`,
        card: cmd,
        quantity: 1,
        ownership: OWNERSHIP_STATUS.UNKNOWN,
        roles: ['commander'],
        typeLine: '',
        addedAt: deck.createdAt,
        source: CARD_SOURCE.USER
      }))
    ]
  }

  // Build set lookup maps
  const ownedSetCodes = new Set(
    setCollection.sets.map(s => s.setCode.toLowerCase())
  )
  const setLevelMap = new Map(
    setCollection.sets.map(s => [s.setCode.toLowerCase(), s.collectionLevel])
  )
  const setNameMap = new Map(
    setCollection.sets.map(s => [s.setCode.toLowerCase(), s.setName])
  )

  // Build printings map from scryfall cache
  const printingsByName = new Map<string, ScryfallCard[]>()
  for (const card of scryfallCache.values()) {
    const key = card.name.toLowerCase()
    if (!printingsByName.has(key)) {
      printingsByName.set(key, [])
    }
    printingsByName.get(key)!.push(card)
  }

  const unpulledItems: PullListItem[] = []
  const pulledItems: PullListItem[] = []

  for (const deckCard of confirmedCards) {
    const cardName = getCardDisplayName(deckCard.card)
    const totalPulled = getTotalPulledQuantity(deckCard)
    const deckCardQty = deckCard.quantity
    const remainingNeeded = deckCardQty - totalPulled

    // Find the card in cache by scryfall ID
    const cachedCard = deckCard.card.scryfallId
      ? scryfallCache.get(deckCard.card.scryfallId)
      : null

    if (!cachedCard) {
      // No cache data, show with deck card info
      if (remainingNeeded > 0) {
        unpulledItems.push({
          cardName,
          setCode: deckCard.card.setCode,
          setName: setNameMap.get(deckCard.card.setCode.toLowerCase()) || deckCard.card.setCode.toUpperCase(),
          collectorNumber: deckCard.card.collectorNumber,
          rarity: 'unknown',
          typeLine: deckCard.typeLine || '',
          manaCost: '',
          cmc: 0,
          quantityNeeded: deckCardQty,
          quantityPulledThisPrint: 0,
          quantityPulledTotal: totalPulled,
          remainingNeeded
        })
      }
      continue
    }

    // Get printings from owned sets
    const allPrintings = printingsByName.get(cardName.toLowerCase()) || [cachedCard]
    const ownedPrintings = allPrintings.filter(p => {
      if (!ownedSetCodes.has(p.set.toLowerCase())) return false
      const level = setLevelMap.get(p.set.toLowerCase()) || 1
      return isRarityAvailable(p.rarity, level)
    })

    // If no owned printings, show from original set
    if (ownedPrintings.length === 0) {
      if (remainingNeeded > 0) {
        unpulledItems.push({
          cardName,
          setCode: cachedCard.set,
          setName: 'Not in collection',
          collectorNumber: cachedCard.collector_number,
          rarity: cachedCard.rarity,
          typeLine: cachedCard.type_line,
          manaCost: cachedCard.mana_cost || '',
          cmc: cachedCard.cmc,
          quantityNeeded: deckCardQty,
          quantityPulledThisPrint: 0,
          quantityPulledTotal: totalPulled,
          remainingNeeded
        })
      }
      continue
    }

    // Create items for each owned printing
    for (const printing of ownedPrintings) {
      const pulledFromThisPrint = getPulledPrintings(deckCard).find(
        p => p.setCode.toLowerCase() === printing.set.toLowerCase() &&
             p.collectorNumber === printing.collector_number
      )?.quantity ?? 0

      const item: PullListItem = {
        cardName,
        setCode: printing.set,
        setName: setNameMap.get(printing.set.toLowerCase()) || printing.set.toUpperCase(),
        collectorNumber: printing.collector_number,
        rarity: printing.rarity,
        typeLine: printing.type_line,
        manaCost: printing.mana_cost || '',
        cmc: printing.cmc,
        quantityNeeded: deckCardQty,
        quantityPulledThisPrint: pulledFromThisPrint,
        quantityPulledTotal: totalPulled,
        remainingNeeded
      }

      if (remainingNeeded > 0) {
        unpulledItems.push(item)
      } else if (pulledFromThisPrint > 0) {
        pulledItems.push(item)
      }
    }
  }

  // Group by set
  const groupBySet = (items: PullListItem[]): PullListGroup[] => {
    const bySet = new Map<string, PullListItem[]>()

    for (const item of items) {
      const key = item.setCode.toLowerCase()
      if (!bySet.has(key)) {
        bySet.set(key, [])
      }
      bySet.get(key)!.push(item)
    }

    const groups: PullListGroup[] = []
    for (const [setCode, setItems] of bySet) {
      // Sort items by rarity, then name
      setItems.sort((a, b) => {
        const rarityDiff = (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99)
        if (rarityDiff !== 0) return rarityDiff
        return a.cardName.localeCompare(b.cardName)
      })

      groups.push({
        setCode,
        setName: setItems[0]?.setName || setCode.toUpperCase(),
        items: setItems
      })
    }

    groups.sort((a, b) => a.setName.localeCompare(b.setName))
    return groups
  }

  const unpulledGroups = groupBySet(unpulledItems)
  const pulledGroups = groupBySet(pulledItems)

  const uniqueUnpulledCards = new Set(unpulledItems.map(i => i.cardName)).size

  // Render unpulled section
  if (unpulledGroups.length > 0) {
    lines.push(`## Unpulled (${uniqueUnpulledCards} cards remaining)`)
    lines.push('')

    for (const group of unpulledGroups) {
      lines.push(`### ${group.setName}`)
      lines.push('| # | Rarity | Type | Cost | Name | Status |')
      lines.push('|---|--------|------|------|------|--------|')

      for (const item of group.items) {
        const primaryType = item.typeLine.split(' ')[0] || 'Unknown'
        const rarityShort = item.rarity[0]?.toUpperCase() || '?'
        const status = `${item.quantityPulledTotal}/${item.quantityNeeded}`
        lines.push(`| ${item.collectorNumber} | ${rarityShort} | ${primaryType} | ${item.manaCost} | ${item.cardName} | ${status} |`)
      }
      lines.push('')
    }
  } else {
    lines.push('## All cards pulled!')
    lines.push('')
    lines.push('Your deck is ready to play.')
    lines.push('')
  }

  // Render pulled section
  if (showPulled && pulledGroups.length > 0) {
    lines.push(`## Already Pulled (${pulledItems.length} cards)`)
    lines.push('')

    for (const group of pulledGroups) {
      lines.push(`### ${group.setName}`)
      lines.push('| # | Rarity | Name | Qty |')
      lines.push('|---|--------|------|-----|')

      for (const item of group.items) {
        const rarityShort = item.rarity[0]?.toUpperCase() || '?'
        lines.push(`| ${item.collectorNumber} | ${rarityShort} | ${item.cardName} | ${item.quantityPulledThisPrint} |`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
