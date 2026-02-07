import { Storage, COLLECTION_LEVEL_RARITIES } from '@mtg-deckbuilder/shared'
import type { CollectionLevel } from '@mtg-deckbuilder/shared'

interface SetFilterInfo {
  setCode: string
  setName: string
  level: CollectionLevel
  rarities: string[]
}

interface CollectionFilterResult {
  filterString: string
  sets: SetFilterInfo[]
  totalSets: number
  isEmpty: boolean
}

/**
 * Generates a Scryfall filter string based on the user's set collection.
 *
 * For each set:
 * - Level 4 (Complete): Just the set code, no rarity filter
 * - Levels 1-3: Set code with appropriate rarity filters
 *
 * Example output:
 * "(set:mkm) OR (set:one (r:common OR r:uncommon OR r:rare)) OR (set:neo (r:common OR r:uncommon))"
 */
export function getCollectionFilter(storage: Storage): CollectionFilterResult {
  const collection = storage.getSetCollection()

  if (!collection.sets || collection.sets.length === 0) {
    return {
      filterString: '',
      sets: [],
      totalSets: 0,
      isEmpty: true
    }
  }

  const setFilters: SetFilterInfo[] = collection.sets.map(entry => ({
    setCode: entry.setCode,
    setName: entry.setName,
    level: entry.collectionLevel,
    rarities: COLLECTION_LEVEL_RARITIES[entry.collectionLevel]
  }))

  // Build the filter string
  const filterParts = setFilters.map(setInfo => {
    if (setInfo.level === 4) {
      // Complete collection - no rarity filter needed
      return `(set:${setInfo.setCode})`
    }

    // Build rarity filter
    const rarityFilter = setInfo.rarities
      .map(r => `r:${r}`)
      .join(' OR ')

    return `(set:${setInfo.setCode} (${rarityFilter}))`
  })

  const filterString = filterParts.join(' OR ')

  return {
    filterString,
    sets: setFilters,
    totalSets: setFilters.length,
    isEmpty: false
  }
}
