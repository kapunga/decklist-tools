import {
  Storage,
  type CardEntry,
  type ScryfallCard,
  findUncachedEntries,
  getUncachedScryfallIds,
  getCardsByIds,
} from '@mtg-deckbuilder/shared'

// Card data for the read-only deck views ("fetch, then warn"): read the
// Scryfall cache, fetch whatever is missing (bounded), write it back to the
// cache, and report the entries that still have no data so the views can
// warn instead of rendering wrong numbers.

/**
 * Fetch Scryfall cards by id. May return fewer cards than requested, or
 * throw — both mean "these ids could not be resolved right now".
 */
export type CardFetcher = (scryfallIds: string[]) => Promise<ScryfallCard[]>

export interface FetchLimits {
  /** Most cards fetched per tool call (two /cards/collection requests). */
  maxCards: number
  /** Give up on the fetch after this long and render with what is cached. */
  timeoutMs: number
}

export const DEFAULT_FETCH_LIMITS: FetchLimits = { maxCards: 150, timeoutMs: 10_000 }

export interface CardData {
  cache: Map<string, ScryfallCard>
  /** Entries that still have no Scryfall data after the fetch. */
  unresolved: CardEntry[]
}

/** Default fetcher: Scryfall's rate-limited batch /cards/collection lookup. */
export const fetchCardsFromScryfall: CardFetcher = getCardsByIds

export async function loadCardData(
  storage: Storage,
  entries: CardEntry[],
  fetchCards: CardFetcher = fetchCardsFromScryfall,
  limits: FetchLimits = DEFAULT_FETCH_LIMITS,
): Promise<CardData> {
  const cached = readCachedCards(storage, entries)
  const missingIds = getUncachedScryfallIds(findUncachedEntries(entries, cached)).slice(0, limits.maxCards)
  const fetched = missingIds.length > 0 ? await fetchWithin(fetchCards, missingIds, limits.timeoutMs) : []
  writeToCache(storage, fetched)
  const cache = mergeCards(cached, fetched)
  return { cache, unresolved: findUncachedEntries(entries, cache) }
}

/** The cached Scryfall cards for `entries`, keyed by id. Reads only; never fetches. */
export function readCachedCards(storage: Storage, entries: CardEntry[]): Map<string, ScryfallCard> {
  const pairs = entries.flatMap(entry => {
    const id = entry.card.scryfallId
    const card = id ? (storage.getCachedCard(id) as ScryfallCard | null) : null
    return id && card ? [[id, card] as const] : []
  })
  return new Map(pairs)
}

/** Run the fetcher, treating a throw or a timeout as "nothing resolved". */
async function fetchWithin(fetchCards: CardFetcher, ids: string[], timeoutMs: number): Promise<ScryfallCard[]> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ScryfallCard[]>(resolve => {
    timer = setTimeout(() => resolve([]), timeoutMs)
  })
  try {
    return await Promise.race([fetchCards(ids), timeout])
  } catch (error) {
    console.error('Scryfall fetch for uncached cards failed:', error)
    return []
  } finally {
    clearTimeout(timer)
  }
}

/** Best-effort: a failed cache write must not stop the view from rendering. */
function writeToCache(storage: Storage, cards: ScryfallCard[]): void {
  if (cards.length === 0) return
  try {
    storage.cacheCardsWithIndex(cards)
  } catch (error) {
    console.error('Failed to cache fetched Scryfall cards:', error)
  }
}

function mergeCards(cache: Map<string, ScryfallCard>, cards: ScryfallCard[]): Map<string, ScryfallCard> {
  return new Map([...cache, ...cards.map(card => [card.id, card] as const)])
}
