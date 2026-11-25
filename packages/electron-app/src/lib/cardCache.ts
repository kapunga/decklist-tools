import type { ScryfallCard } from '@/types'

// The renderer's one way to get card data. Lookups climb a ladder — memory, then the
// disk cache, then a single batched Scryfall request — and each rung is only asked for
// what the rung below could not supply. Effects are injected, so this file never
// touches `window` and the whole ladder runs in a plain Node test.

/** The outcome of asking Scryfall for a batch of ids. */
export interface CardBatchResult {
  found: ScryfallCard[]
  /** Scryfall answered and has no such card. Safe to remember. */
  notFound: string[]
  /** Scryfall could not be asked (offline, rate limited, timed out). Never remembered. */
  failed: string[]
}

export interface CardCacheDeps {
  readDisk: (ids: string[]) => Promise<Record<string, ScryfallCard>>
  fetchRemote: (ids: string[]) => Promise<CardBatchResult>
  writeDisk: (cards: ScryfallCard[]) => Promise<void>
}

export type Cards = ReadonlyMap<string, ScryfallCard>

export interface CardCache {
  /** Memory only, synchronous. */
  peek(id: string): ScryfallCard | undefined
  /** Memory plus one batched disk read. Never touches the network. */
  getLocal(ids: readonly string[]): Promise<Cards>
  /** As `getLocal`, then one batched Scryfall request for what is still missing. Never rejects. */
  getCards(ids: readonly string[]): Promise<Cards>
  getCard(id: string): Promise<ScryfallCard | null>
  /** Remember cards already in hand, in memory only. */
  put(cards: readonly ScryfallCard[]): void
  /** Remember cards already in hand and write them to the disk cache. Never rejects. */
  save(cards: readonly ScryfallCard[]): Promise<void>
}

const unique = (ids: readonly string[]): string[] => [...new Set(ids)]

const failedBatch = (ids: readonly string[]): CardBatchResult => ({ found: [], notFound: [], failed: [...ids] })

type InFlight = Map<string, Promise<void>>

// Start `work` for the ids nobody is working on yet, then wait for every id asked for —
// including those another caller started. `work` must not reject.
function shareWork(inFlight: InFlight, ids: string[], work: (ids: string[]) => Promise<void>): Promise<void> {
  const unclaimed = ids.filter(id => !inFlight.has(id))
  if (unclaimed.length > 0) {
    const task = work(unclaimed).finally(() => unclaimed.forEach(id => inFlight.delete(id)))
    unclaimed.forEach(id => inFlight.set(id, task))
  }
  return Promise.all(ids.map(id => inFlight.get(id))).then(() => undefined)
}

export function createCardCache(deps: CardCacheDeps): CardCache {
  const memory = new Map<string, ScryfallCard>()
  const knownMissing = new Set<string>()
  const reading: InFlight = new Map()
  const fetching: InFlight = new Map()

  const put = (cards: readonly ScryfallCard[]): void => {
    for (const card of cards) memory.set(card.id, card)
  }

  const held = (ids: readonly string[]): Cards =>
    new Map(ids.flatMap(id => {
      const card = memory.get(id)
      return card ? [[id, card] as const] : []
    }))

  const writeToDisk = (cards: readonly ScryfallCard[]): Promise<void> =>
    cards.length === 0 ? Promise.resolve() : deps.writeDisk([...cards]).catch(() => undefined)

  const readFromDisk = (ids: string[]): Promise<void> =>
    deps.readDisk(ids).then(found => put(Object.values(found)), () => undefined)

  const fetchFromRemote = async (ids: string[]): Promise<void> => {
    const result = await deps.fetchRemote(ids).catch(() => failedBatch(ids))
    put(result.found)
    result.notFound.forEach(id => knownMissing.add(id))
    void writeToDisk(result.found)
  }

  const worthAsking = (id: string): boolean => !memory.has(id) && !knownMissing.has(id)

  const getLocal = async (ids: readonly string[]): Promise<Cards> => {
    const wanted = unique(ids)
    await shareWork(reading, wanted.filter(id => !memory.has(id)), readFromDisk)
    return held(wanted)
  }

  const getCards = async (ids: readonly string[]): Promise<Cards> => {
    const wanted = unique(ids)
    await getLocal(wanted)
    await shareWork(fetching, wanted.filter(worthAsking), fetchFromRemote)
    return held(wanted)
  }

  return {
    peek: id => memory.get(id),
    getLocal,
    getCards,
    getCard: async id => (await getCards([id])).get(id) ?? null,
    put,
    save: cards => {
      put(cards)
      return writeToDisk(cards)
    },
  }
}

/** Pair a positional lookup (a card or null per id) back up with the ids asked for. */
export function toBatchResult(ids: readonly string[], results: readonly (ScryfallCard | null)[]): CardBatchResult {
  return {
    found: results.filter((card): card is ScryfallCard => card !== null),
    notFound: ids.filter((_, i) => results[i] === null),
    failed: [],
  }
}

const settleWithin = <T>(task: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms)
    void task.then(value => {
      clearTimeout(timer)
      resolve(value)
    })
  })

/**
 * Adapt a positional batch lookup that rejects on failure into `fetchRemote`. A rejection
 * or a lookup slower than `timeoutMs` reports every id as failed — never as not found.
 */
export function createRemoteFetch(
  lookup: (ids: string[]) => Promise<(ScryfallCard | null)[]>,
  timeoutMs: number,
): CardCacheDeps['fetchRemote'] {
  return ids =>
    settleWithin(
      lookup(ids).then(results => toBatchResult(ids, results), () => failedBatch(ids)),
      timeoutMs,
      failedBatch(ids),
    )
}
