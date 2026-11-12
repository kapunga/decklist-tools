import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CachedScryfallClient } from './cachedClient.js'
import { ScryfallError, setScryfallTransport } from './index.js'
import type { Storage } from '../storage/index.js'
import type { ScryfallCard } from '../types/index.js'

const card = (id: string, name: string, set = 'lea', collector_number = '1'): ScryfallCard => ({
  id, name, set, collector_number,
  cmc: 1, type_line: 'Instant', color_identity: [], rarity: 'common', legalities: {},
} as ScryfallCard)

/** In-memory stand-in for the Storage cache methods the client touches. */
function memoryStorage() {
  const byId = new Map<string, ScryfallCard>()
  const byName = new Map<string, string>()
  const cacheCardsWithIndex = vi.fn((cards: ScryfallCard[]) => {
    for (const c of cards) {
      byId.set(c.id, c)
      byName.set(c.name.toLowerCase(), c.id)
    }
  })
  const storage = {
    getCachedCard: (id: string) => byId.get(id) ?? null,
    getCachedCardByName: (name: string) => {
      const id = byName.get(name.toLowerCase())
      return id ? byId.get(id) ?? null : null
    },
    getCachedCardBySetCollector: (set: string, num: string) =>
      [...byId.values()].find(c => c.set === set && c.collector_number === num) ?? null,
    cacheCardWithIndex: (c: ScryfallCard) => cacheCardsWithIndex([c]),
    cacheCardsWithIndex,
  }
  return { storage: storage as unknown as Storage, cacheCardsWithIndex }
}

describe('CachedScryfallClient', () => {
  const fetchMock = vi.fn(async (_url: string) =>
    new Response(JSON.stringify(card('bolt-id', 'Lightning Bolt')), { status: 200 }))

  beforeEach(() => {
    fetchMock.mockClear()
    setScryfallTransport(fetchMock)
  })
  afterEach(() => setScryfallTransport())

  it('serves a repeat name lookup from cache with no network call', async () => {
    const client = new CachedScryfallClient(memoryStorage().storage)
    await client.getCardByName('Lightning Bolt')
    const again = await client.getCardByName('lightning bolt')
    expect(again?.id).toBe('bolt-id')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves a repeat id lookup from cache with no network call', async () => {
    const client = new CachedScryfallClient(memoryStorage().storage)
    await client.getCardById('bolt-id')
    await client.getCardById('bolt-id')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses the exact-name endpoint when asked', async () => {
    const client = new CachedScryfallClient(memoryStorage().storage)
    await client.getCardByName('Lightning Bolt', true)
    expect(fetchMock.mock.calls[0][0]).toContain('exact=')
  })

  describe('rememberCards', () => {
    it('caches search results so later lookups by name hit the cache', async () => {
      const { storage } = memoryStorage()
      const client = new CachedScryfallClient(storage)
      client.rememberCards([card('shock-id', 'Shock')])
      expect((await client.getCardByName('Shock'))?.id).toBe('shock-id')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does not rebind a name that already resolves to a cached printing', () => {
      const { storage, cacheCardsWithIndex } = memoryStorage()
      const client = new CachedScryfallClient(storage)
      client.rememberCards([card('bolt-lea', 'Lightning Bolt')])
      client.rememberCards([card('bolt-m10', 'Lightning Bolt', 'm10', '146'), card('shock-id', 'Shock')])
      expect(cacheCardsWithIndex).toHaveBeenLastCalledWith([card('shock-id', 'Shock')])
      expect(storage.getCachedCardByName('Lightning Bolt')?.id).toBe('bolt-lea')
    })

    it('keeps only the first printing of a name within one batch', () => {
      const { storage, cacheCardsWithIndex } = memoryStorage()
      new CachedScryfallClient(storage).rememberCards([
        card('a', 'Opt', 'xln', '65'),
        card('b', 'Opt', 'dom', '60'),
      ])
      expect(cacheCardsWithIndex).toHaveBeenCalledWith([card('a', 'Opt', 'xln', '65')])
    })
  })

  describe('getCardsByNames', () => {
    /** Answer POST /cards/collection with a card per requested name, except names in `missing`. */
    const collectionFetch = (missing: string[] = []) => vi.fn(async (_url: string, init?: { body?: string }) => {
      const { identifiers } = JSON.parse(init?.body ?? '{}') as { identifiers: { name: string }[] }
      const isMissing = (id: { name: string }) => missing.includes(id.name)
      return new Response(JSON.stringify({
        data: identifiers.filter(id => !isMissing(id)).map(id => card(`${id.name}-id`, id.name)),
        not_found: identifiers.filter(isMissing),
      }), { status: 200 })
    })

    it('serves fully cached names with zero requests', async () => {
      const { storage } = memoryStorage()
      const client = new CachedScryfallClient(storage)
      client.rememberCards([card('bolt-id', 'Lightning Bolt'), card('shock-id', 'Shock')])
      const cards = await client.getCardsByNames(['Shock', 'Lightning Bolt'])
      expect(cards.map(c => c?.id)).toEqual(['shock-id', 'bolt-id'])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('fetches only the misses, keeps input order, and caches what it fetched', async () => {
      const fetch = collectionFetch(['Nonsense'])
      setScryfallTransport(fetch)
      const { storage } = memoryStorage()
      const client = new CachedScryfallClient(storage)
      client.rememberCards([card('bolt-id', 'Lightning Bolt')])

      const cards = await client.getCardsByNames(['Opt', 'Lightning Bolt', 'Nonsense', 'Shock'])
      expect(cards.map(c => c?.name ?? null)).toEqual(['Opt', 'Lightning Bolt', null, 'Shock'])
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(JSON.parse(fetch.mock.calls[0][1]!.body!).identifiers)
        .toEqual([{ name: 'Opt' }, { name: 'Nonsense' }, { name: 'Shock' }])

      await client.getCardsByNames(['Opt', 'Lightning Bolt', 'Shock'])
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('splits more than 75 uncached names into 75-name requests', async () => {
      const fetch = collectionFetch()
      setScryfallTransport(fetch)
      const names = Array.from({ length: 160 }, (_, i) => `Card ${i}`)
      const cards = await new CachedScryfallClient(memoryStorage().storage).getCardsByNames(names)
      expect(cards.map(c => c?.name)).toEqual(names)
      expect(fetch.mock.calls.map(([, init]) => JSON.parse(init!.body!).identifiers.length))
        .toEqual([75, 75, 10])
    })

    it('rejects with Scryfall\'s error when a batch request fails, caching nothing', async () => {
      setScryfallTransport(vi.fn(async () =>
        new Response(JSON.stringify({ details: 'Bad identifiers' }), { status: 400 })))
      const { storage, cacheCardsWithIndex } = memoryStorage()
      const error = await new CachedScryfallClient(storage).getCardsByNames(['Opt']).catch(e => e)
      expect(error).toBeInstanceOf(ScryfallError)
      expect(error.message).toBe('Bad identifiers')
      expect(cacheCardsWithIndex).not.toHaveBeenCalled()
    })
  })
})
