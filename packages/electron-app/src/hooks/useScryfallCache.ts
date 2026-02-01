import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getCardById } from '@/lib/scryfall'
import type { DeckCard, ScryfallCard } from '@/types'

export function useScryfallCache(cards: DeckCard[]) {
  const scryfallIds = useMemo(() => {
    const ids = new Set<string>()
    for (const card of cards) {
      if (card.card.scryfallId) ids.add(card.card.scryfallId)
    }
    return [...ids]
  }, [cards])

  const queries = useQueries({
    queries: scryfallIds.map(id => ({
      queryKey: ['scryfall', id],
      queryFn: () => getCardById(id),
      staleTime: 1000 * 60 * 60, // 1 hour
    })),
  })

  const cache = useMemo(() => {
    const map = new Map<string, ScryfallCard>()
    for (let i = 0; i < scryfallIds.length; i++) {
      const data = queries[i]?.data
      if (data) map.set(scryfallIds[i], data)
    }
    return map
  }, [scryfallIds, queries])

  const isLoading = queries.some(q => q.isLoading)

  return { cache, isLoading }
}
