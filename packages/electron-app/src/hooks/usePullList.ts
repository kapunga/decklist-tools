import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useStore } from '@/hooks/useStore'
import { getCardPrintings } from '@/lib/scryfall'
import type { Deck, DeckCard, ScryfallCard, PullListSortKey, CollectionLevel } from '@/types'
import { getTotalPulledQuantity, COLLECTION_LEVEL_RARITIES } from '@/types'

export interface PullListItem {
  deckCardId: string
  cardName: string
  setCode: string
  setName: string
  collectorNumber: string
  rarity: string
  typeLine: string
  manaCost: string
  cmc: number
  quantityNeeded: number
  quantityPulledThisPrint: number
  quantityPulledTotal: number
  remainingNeeded: number
  scryfallId: string
}

export interface PullListGroup {
  setCode: string
  setName: string
  items: PullListItem[]
}

// Rarity order for sorting (mythic first, common last)
const RARITY_ORDER: Record<string, number> = {
  'mythic': 0,
  'rare': 1,
  'uncommon': 2,
  'common': 3,
  'special': 4,
  'bonus': 5
}

// Primary type order for sorting
const TYPE_ORDER: Record<string, number> = {
  'Creature': 0,
  'Planeswalker': 1,
  'Instant': 2,
  'Sorcery': 3,
  'Enchantment': 4,
  'Artifact': 5,
  'Land': 6,
  'Battle': 7
}

function getPrimaryType(typeLine: string): string {
  for (const type of Object.keys(TYPE_ORDER)) {
    if (typeLine.includes(type)) return type
  }
  return 'Other'
}

// Parse mana cost for sorting - returns a sortable value
function getManaCostSortValue(manaCost: string | undefined): number {
  if (!manaCost) return 0

  // Extract symbols
  const symbols = manaCost.match(/\{([^}]+)\}/g) || []
  let cmc = 0
  let colorComplexity = 0

  for (const symbol of symbols) {
    const inner = symbol.slice(1, -1)
    // Numeric mana
    const num = parseInt(inner, 10)
    if (!isNaN(num)) {
      cmc += num
    } else if (inner === 'X') {
      // X costs sort as 0 CMC
    } else if (inner.includes('/')) {
      // Hybrid mana
      cmc += 1
      colorComplexity += 2
    } else {
      // Colored mana
      cmc += 1
      colorComplexity += 1
    }
  }

  // Combine CMC and color complexity for sorting
  // CMC takes priority (multiply by 100), then color complexity
  return cmc * 100 + colorComplexity
}

// Check if a rarity is included at a collection level
function isRarityAvailable(rarity: string, collectionLevel: CollectionLevel): boolean {
  const allowedRarities = COLLECTION_LEVEL_RARITIES[collectionLevel]
  return allowedRarities.includes(rarity.toLowerCase())
}

// Compare function for a single sort key
function compareByKey(
  a: PullListItem,
  b: PullListItem,
  key: PullListSortKey
): number {
  switch (key) {
    case 'collectorNumber':
      return a.collectorNumber.localeCompare(b.collectorNumber, undefined, { numeric: true })
    case 'rarity':
      return (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99)
    case 'type':
      return (TYPE_ORDER[getPrimaryType(a.typeLine)] ?? 99) - (TYPE_ORDER[getPrimaryType(b.typeLine)] ?? 99)
    case 'manaCost':
      return getManaCostSortValue(a.manaCost) - getManaCostSortValue(b.manaCost)
    case 'name':
      return a.cardName.localeCompare(b.cardName)
    default:
      return 0
  }
}

// Multi-column sort comparator
function createComparator(sortColumns: PullListSortKey[]) {
  return (a: PullListItem, b: PullListItem): number => {
    for (const key of sortColumns) {
      const result = compareByKey(a, b, key)
      if (result !== 0) return result
    }
    return 0
  }
}

export function usePullList(deck: Deck | null) {
  const setCollection = useStore(state => state.setCollection)
  const pullListConfig = useStore(state => state.pullListConfig)

  // Get all confirmed cards that aren't already marked as pulled (including commanders)
  const confirmedCards = useMemo(() => {
    if (!deck) return []

    // Exclude cards with legacy ownership === 'pulled' - they're already pulled
    const cards = deck.cards.filter(c =>
      c.inclusion === 'confirmed' && c.ownership !== 'pulled'
    )

    // Add commanders as pseudo-cards for pulling
    const commanderCards: DeckCard[] = deck.commanders.map(cmd => ({
      id: `commander-${cmd.name}`,
      card: cmd,
      quantity: 1,
      inclusion: 'confirmed' as const,
      ownership: 'unknown' as const,
      roles: ['commander'],
      typeLine: '',
      isPinned: true,
      addedAt: deck.createdAt,
      addedBy: 'user' as const
    }))

    return [...cards, ...commanderCards]
  }, [deck])

  // Get unique card names that need printings fetched
  const cardNames = useMemo(() => {
    return [...new Set(confirmedCards.map(c => c.card.name))]
  }, [confirmedCards])

  // Fetch printings for all cards
  const printingsQueries = useQueries({
    queries: cardNames.map(name => ({
      queryKey: ['printings', name],
      queryFn: () => getCardPrintings(name),
      staleTime: 1000 * 60 * 60, // 1 hour
    })),
  })

  // Build printings map
  const printingsMap = useMemo(() => {
    const map = new Map<string, ScryfallCard[]>()
    for (let i = 0; i < cardNames.length; i++) {
      const data = printingsQueries[i]?.data
      if (data?.data) {
        map.set(cardNames[i].toLowerCase(), data.data)
      }
    }
    return map
  }, [cardNames, printingsQueries])

  // Compute pull list items
  const { unpulledItems, pulledItems } = useMemo(() => {
    if (!deck || !setCollection) {
      return { unpulledItems: [], pulledItems: [] }
    }

    const ownedSetCodes = new Set(
      setCollection.sets.map(s => s.setCode.toLowerCase())
    )
    const setLevelMap = new Map(
      setCollection.sets.map(s => [s.setCode.toLowerCase(), s.collectionLevel])
    )
    const setNameMap = new Map(
      setCollection.sets.map(s => [s.setCode.toLowerCase(), s.setName])
    )

    const unpulled: PullListItem[] = []
    const pulled: PullListItem[] = []

    for (const deckCard of confirmedCards) {
      const cardName = deckCard.card.name
      const printings = printingsMap.get(cardName.toLowerCase()) || []
      const totalPulled = getTotalPulledQuantity(deckCard)
      const remainingNeeded = deckCard.quantity - totalPulled

      // Get printings from owned sets
      const ownedPrintings = printings.filter(p => {
        if (!ownedSetCodes.has(p.set.toLowerCase())) return false
        const level = setLevelMap.get(p.set.toLowerCase()) || 1
        return isRarityAvailable(p.rarity, level)
      })

      // If no owned printings, show original printing as "not in collection"
      if (ownedPrintings.length === 0) {
        const originalPrinting = printings[0]
        if (originalPrinting) {
          const item: PullListItem = {
            deckCardId: deckCard.id,
            cardName,
            setCode: originalPrinting.set,
            setName: 'Not in collection',
            collectorNumber: originalPrinting.collector_number,
            rarity: originalPrinting.rarity,
            typeLine: originalPrinting.type_line,
            manaCost: originalPrinting.mana_cost || '',
            cmc: originalPrinting.cmc,
            quantityNeeded: deckCard.quantity,
            quantityPulledThisPrint: 0,
            quantityPulledTotal: totalPulled,
            remainingNeeded,
            scryfallId: originalPrinting.id
          }
          if (remainingNeeded > 0) {
            unpulled.push(item)
          }
        }
        continue
      }

      // Create items for each owned printing
      for (const printing of ownedPrintings) {
        const pulledFromThisPrint = (deckCard.pulledPrintings ?? []).find(
          (p: { setCode: string; collectorNumber: string; quantity: number }) =>
            p.setCode.toLowerCase() === printing.set.toLowerCase() &&
            p.collectorNumber === printing.collector_number
        )?.quantity ?? 0

        const item: PullListItem = {
          deckCardId: deckCard.id,
          cardName,
          setCode: printing.set,
          setName: setNameMap.get(printing.set.toLowerCase()) || printing.set.toUpperCase(),
          collectorNumber: printing.collector_number,
          rarity: printing.rarity,
          typeLine: printing.type_line,
          manaCost: printing.mana_cost || '',
          cmc: printing.cmc,
          quantityNeeded: deckCard.quantity,
          quantityPulledThisPrint: pulledFromThisPrint,
          quantityPulledTotal: totalPulled,
          remainingNeeded,
          scryfallId: printing.id
        }

        if (remainingNeeded > 0) {
          unpulled.push(item)
        } else if (pulledFromThisPrint > 0) {
          pulled.push(item)
        }
      }
    }

    return { unpulledItems: unpulled, pulledItems: pulled }
  }, [deck, setCollection, confirmedCards, printingsMap])

  // Group items by set and sort
  const sortColumns = pullListConfig?.sortColumns || ['rarity', 'type', 'manaCost', 'name']
  const comparator = useMemo(() => createComparator(sortColumns), [sortColumns])

  const unpulledGroups = useMemo(() => {
    const bySet = new Map<string, PullListItem[]>()

    for (const item of unpulledItems) {
      const key = item.setCode.toLowerCase()
      if (!bySet.has(key)) {
        bySet.set(key, [])
      }
      bySet.get(key)!.push(item)
    }

    const groups: PullListGroup[] = []
    for (const [setCode, items] of bySet) {
      items.sort(comparator)
      groups.push({
        setCode,
        setName: items[0]?.setName || setCode.toUpperCase(),
        items
      })
    }

    // Sort groups by set name
    groups.sort((a, b) => a.setName.localeCompare(b.setName))

    return groups
  }, [unpulledItems, comparator])

  const pulledGroups = useMemo(() => {
    const bySet = new Map<string, PullListItem[]>()

    for (const item of pulledItems) {
      const key = item.setCode.toLowerCase()
      if (!bySet.has(key)) {
        bySet.set(key, [])
      }
      bySet.get(key)!.push(item)
    }

    const groups: PullListGroup[] = []
    for (const [setCode, items] of bySet) {
      items.sort(comparator)
      groups.push({
        setCode,
        setName: items[0]?.setName || setCode.toUpperCase(),
        items
      })
    }

    groups.sort((a, b) => a.setName.localeCompare(b.setName))

    return groups
  }, [pulledItems, comparator])

  const isLoading = printingsQueries.some(q => q.isLoading)
  const showPulledSection = pullListConfig?.showPulledSection ?? true

  // Calculate totals
  const uniqueUnpulledCards = new Set(unpulledItems.map(i => i.deckCardId)).size
  const totalRemainingCards = unpulledItems.reduce((sum, item) => sum + item.remainingNeeded, 0)

  return {
    unpulledGroups,
    pulledGroups,
    uniqueUnpulledCards,
    totalRemainingCards,
    isLoading,
    showPulledSection,
    sortColumns
  }
}
