import { useEffect, useMemo, useState } from 'react'
import type { CardEntry, ScryfallCard } from '@/types'
import { cardCache } from '@/lib/cardCacheInstance'

/**
 * Build a STABLE PRIMITIVE signature of the scryfall ids present in a card list:
 * sorted, de-duplicated, comma-joined. Two different array instances containing
 * the same ids produce an equal string. This lets `useScryfallCache` key its
 * fetch effect on a value rather than on an array reference — callers frequently
 * pass `cards` as a freshly-built array each render (e.g. `getAllDeckEntries`,
 * which flatMaps), and keying on the reference caused an infinite passive-effect
 * loop (effect runs → setCache(new Map) → re-render → new array ref → effect
 * runs → …), surfacing as React error #185.
 */
export function cardsToScryfallIdsKey(cards: CardEntry[]): string {
  const ids = new Set<string>()
  for (const card of cards) {
    if (card.card.scryfallId) ids.add(card.card.scryfallId)
  }
  return [...ids].sort().join(',')
}

type CardMap = Map<string, ScryfallCard>

/** Whether two maps hold the very same card objects under the same ids. */
export function sameCards(a: ReadonlyMap<string, ScryfallCard>, b: ReadonlyMap<string, ScryfallCard>): boolean {
  if (a.size !== b.size) return false
  for (const [id, card] of a) {
    if (b.get(id) !== card) return false
  }
  return true
}

const idsOf = (idsKey: string): string[] => (idsKey === '' ? [] : idsKey.split(','))

const inMemory = (ids: readonly string[]): CardMap =>
  new Map(ids.flatMap(id => {
    const card = cardCache.peek(id)
    return card ? [[id, card] as const] : []
  }))

// Hand back the map already held when nothing in it changed, so memos keyed on the map
// (stats, validation, grouping) are not invalidated by a lookup that found nothing new.
const keepIfSame = (next: ReadonlyMap<string, ScryfallCard>) => (prev: CardMap): CardMap =>
  sameCards(prev, next) ? prev : new Map(next)

/**
 * Scryfall data for a list of entries, by scryfall id. Whatever is already in memory is
 * there on the first render; the disk cache fills in next (`isLoading` covers only that
 * step); cards cached nowhere are then fetched from Scryfall in one batch, in the
 * background, and appear when they arrive.
 */
export function useScryfallCache(cards: CardEntry[]) {
  const idsKey = useMemo(() => cardsToScryfallIdsKey(cards), [cards])

  const [cache, setCache] = useState<CardMap>(() => inMemory(idsOf(idsKey)))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const ids = idsOf(idsKey)
    const known = inMemory(ids)
    setCache(keepIfSame(known))
    if (known.size === ids.length) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    void cardCache.getLocal(ids)
      .then(local => {
        if (cancelled) return local
        setCache(keepIfSame(local))
        setIsLoading(false)
        return local.size === ids.length ? local : cardCache.getCards(ids)
      })
      .then(all => {
        if (!cancelled) setCache(keepIfSame(all))
      })

    return () => { cancelled = true }
  }, [idsKey])

  return { cache, isLoading }
}
