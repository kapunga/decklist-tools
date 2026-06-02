import { useEffect, useMemo, useState } from 'react'
import type { CardEntry, ScryfallCard } from '@/types'

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

export function useScryfallCache(cards: CardEntry[]) {
  const idsKey = useMemo(() => cardsToScryfallIdsKey(cards), [cards])

  const [cache, setCache] = useState<Map<string, ScryfallCard>>(() => new Map())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (idsKey === '') {
      // Preserve the existing reference when already empty so we don't trigger a
      // needless state update (and re-render) on every mount/update.
      setCache(prev => (prev.size === 0 ? prev : new Map()))
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    window.electronAPI.getCachedCards(idsKey.split(','))
      .then((result) => {
        if (cancelled) return
        const map = new Map<string, ScryfallCard>()
        for (const [id, data] of Object.entries(result)) {
          map.set(id, data as ScryfallCard)
        }
        setCache(map)
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCache(prev => (prev.size === 0 ? prev : new Map()))
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [idsKey])

  return { cache, isLoading }
}
