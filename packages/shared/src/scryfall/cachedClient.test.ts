import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CachedScryfallClient } from './cachedClient.js'
import { setScryfallTransport } from './index.js'
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
})
