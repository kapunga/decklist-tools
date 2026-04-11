import { useEffect, useMemo, useState } from 'react'
import type { CardEntry, ScryfallCard } from '@/types'

export function useScryfallCache(cards: CardEntry[]) {
  const scryfallIds = useMemo(() => {
    const ids = new Set<string>()
    for (const card of cards) {
      if (card.card.scryfallId) ids.add(card.card.scryfallId)
    }
    return [...ids]
  }, [cards])

  const [cache, setCache] = useState<Map<string, ScryfallCard>>(() => new Map())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (scryfallIds.length === 0) {
      setCache(new Map())
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    window.electronAPI.getCachedCards(scryfallIds)
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
        setCache(new Map())
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [scryfallIds])

  return { cache, isLoading }
}
