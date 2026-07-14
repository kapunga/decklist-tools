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
 * Generates a Scryfall filter string scoped to the user's tracked set collection.
 *
 * Scopes results to owned sets only — no rarity filtering. Each entry's
 * `collectionLevel` (1-4) and the rarities normally associated with that level
 * are still returned as `rarities`/`level` metadata: a *hint* for judging how
 * likely the user is to own a specific printing, not a hard inclusion gate.
 * A level-1 set's mythic is less likely owned than its common, but it isn't
 * excluded here — callers combine this with each search result's own `rarity`
 * to make that judgment themselves.
 *
 * Example output:
 * "(set:mkm) OR (set:one) OR (set:neo)"
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

  const filterString = setFilters
    .map(setInfo => `(set:${setInfo.setCode})`)
    .join(' OR ')

  return {
    filterString,
    sets: setFilters,
    totalSets: setFilters.length,
    isEmpty: false
  }
}
