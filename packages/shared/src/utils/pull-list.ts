import type { PullListItem, PullListGroup } from '../types/index.js'

interface NamedCollectionSet {
  setCode: string
  setName: string
}

interface NamedCard {
  set: string
  set_name?: string
}

/**
 * Build a set-code -> display-name resolver. Collection names win; cached card
 * data (`set_name`) covers sets outside the collection; the uppercased code is
 * the last resort. Codes are matched case-insensitively.
 */
export function buildSetNameResolver(
  collectionSets: readonly NamedCollectionSet[],
  cards: Iterable<NamedCard>,
): (setCode: string) => string {
  const fromCards = [...cards]
    .filter((c): c is NamedCard & { set_name: string } => !!c.set_name)
    .map((c): [string, string] => [c.set.toLowerCase(), c.set_name])
  const fromCollection = collectionSets.map((s): [string, string] => [s.setCode.toLowerCase(), s.setName])
  // Later entries override earlier ones, so the collection takes precedence.
  const names = new Map<string, string>([...fromCards, ...fromCollection])
  return setCode => names.get(setCode.toLowerCase()) ?? setCode.toUpperCase()
}

/** Heading text for a pull-list group; not-in-collection groups are suffixed. */
export function pullListGroupHeading(group: Pick<PullListGroup, 'setName' | 'notInCollection'>): string {
  return group.notInCollection ? `${group.setName} — not in collection` : group.setName
}

const groupKey = (item: PullListItem): string =>
  `${item.notInCollection ? 'missing' : 'owned'}:${item.setCode.toLowerCase()}`

const compareGroups = (a: PullListGroup, b: PullListGroup): number =>
  Number(!!a.notInCollection) - Number(!!b.notInCollection) || a.setName.localeCompare(b.setName)

/**
 * Group items by set (keeping owned and not-in-collection items of the same
 * set apart), sort items within each group, and order groups owned-first then
 * by set name. Does not mutate its input.
 */
export function groupPullListItems<T extends PullListItem>(
  items: readonly T[],
  compareItems: (a: T, b: T) => number,
): Array<Omit<PullListGroup, 'items'> & { items: T[] }> {
  const buckets = items.reduce((acc, item) => {
    const key = groupKey(item)
    return acc.set(key, [...(acc.get(key) ?? []), item])
  }, new Map<string, T[]>())

  return [...buckets.values()]
    .map(bucket => ({
      setCode: bucket[0].setCode.toLowerCase(),
      setName: bucket[0].setName,
      ...(bucket[0].notInCollection ? { notInCollection: true } : {}),
      items: [...bucket].sort(compareItems),
    }))
    .sort(compareGroups)
}
