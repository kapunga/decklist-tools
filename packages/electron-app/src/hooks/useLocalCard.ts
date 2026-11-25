import { useEffect, useState } from 'react'
import type { ScryfallCard } from '@/types'
import { cardCache } from '@/lib/cardCacheInstance'

/**
 * A card from memory or the disk cache — never the network. For previews driven by
 * hover, where a request per card passed over would be a request storm.
 */
export function useLocalCard(scryfallId: string | null): ScryfallCard | null {
  const [fromDisk, setFromDisk] = useState<ScryfallCard | null>(null)
  const inMemory = scryfallId ? cardCache.peek(scryfallId) ?? null : null

  useEffect(() => {
    if (!scryfallId || inMemory) return
    let cancelled = false
    void cardCache.getLocal([scryfallId]).then(found => {
      if (!cancelled) setFromDisk(found.get(scryfallId) ?? null)
    })
    return () => { cancelled = true }
  }, [scryfallId, inMemory])

  return inMemory ?? (fromDisk?.id === scryfallId ? fromDisk : null)
}
