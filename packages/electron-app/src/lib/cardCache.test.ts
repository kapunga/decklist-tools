import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ScryfallCard } from '@/types'
import { createCardCache, createRemoteFetch, toBatchResult, type CardCacheDeps } from './cardCache'

const card = (id: string): ScryfallCard => ({ id, name: `Card ${id}` }) as ScryfallCard

interface World {
  disk?: Record<string, ScryfallCard>
  remote?: Record<string, ScryfallCard>
  /** Ids Scryfall cannot be asked about right now (offline, rate limited). */
  unreachable?: string[]
}

// A cache wired to an in-memory disk and an in-memory Scryfall, recording every call.
function world({ disk = {}, remote = {}, unreachable = [] }: World = {}) {
  const state = { disk: { ...disk }, remote: { ...remote }, unreachable: new Set(unreachable) }
  const calls = { readDisk: [] as string[][], fetchRemote: [] as string[][], writeDisk: [] as string[][] }
  const deps: CardCacheDeps = {
    readDisk: async ids => {
      calls.readDisk.push([...ids])
      return Object.fromEntries(ids.filter(id => state.disk[id]).map(id => [id, state.disk[id]]))
    },
    fetchRemote: async ids => {
      calls.fetchRemote.push([...ids])
      const reachable = ids.filter(id => !state.unreachable.has(id))
      return {
        found: reachable.filter(id => state.remote[id]).map(id => state.remote[id]),
        notFound: reachable.filter(id => !state.remote[id]),
        failed: ids.filter(id => state.unreachable.has(id)),
      }
    },
    writeDisk: async cards => {
      calls.writeDisk.push(cards.map(c => c.id))
      for (const c of cards) state.disk[c.id] = c
    },
  }
  return { cache: createCardCache(deps), deps, calls, state }
}

const flat = (batches: string[][]): string[] => batches.flat().sort()

describe('createCardCache', () => {
  describe('getCards', () => {
    it('resolves from memory, then disk, then Scryfall', async () => {
      const { cache, calls } = world({ disk: { d: card('d') }, remote: { r: card('r') } })
      cache.put([card('m')])

      const found = await cache.getCards(['m', 'd', 'r'])

      expect([...found.keys()].sort()).toEqual(['d', 'm', 'r'])
      expect(calls.readDisk).toEqual([['d', 'r']])
      expect(calls.fetchRemote).toEqual([['r']])
    })

    it('writes exactly the cards Scryfall returned to disk, once', async () => {
      const { cache, calls } = world({ disk: { d: card('d') }, remote: { r1: card('r1'), r2: card('r2') } })

      await cache.getCards(['d', 'r1', 'r2'])

      expect(calls.writeDisk).toEqual([['r1', 'r2']])
    })

    it('does not ask Scryfall when everything is local', async () => {
      const { cache, calls } = world({ disk: { a: card('a'), b: card('b') } })

      await cache.getCards(['a', 'b'])

      expect(calls.fetchRemote).toEqual([])
      expect(calls.writeDisk).toEqual([])
    })

    it('serves a second call from memory without touching disk or Scryfall', async () => {
      const { cache, calls } = world({ disk: { a: card('a') }, remote: { b: card('b') } })
      await cache.getCards(['a', 'b'])

      const again = await cache.getCards(['a', 'b'])

      expect(again.size).toBe(2)
      expect(calls.readDisk).toHaveLength(1)
      expect(calls.fetchRemote).toHaveLength(1)
    })

    it('reads disk and asks Scryfall once per id when two calls overlap', async () => {
      // Every deck tile on the deck list asks at the same moment, and decks share cards.
      const { cache, calls } = world({
        disk: { d: card('d') },
        remote: { r1: card('r1'), r2: card('r2'), r3: card('r3') },
      })

      const [first, second] = await Promise.all([
        cache.getCards(['d', 'r1', 'r2']),
        cache.getCards(['d', 'r2', 'r3']),
      ])

      expect([...first.keys()].sort()).toEqual(['d', 'r1', 'r2'])
      expect([...second.keys()].sort()).toEqual(['d', 'r2', 'r3'])
      expect(flat(calls.readDisk)).toEqual(['d', 'r1', 'r2', 'r3'])
      expect(flat(calls.fetchRemote)).toEqual(['r1', 'r2', 'r3'])
    })

    it('asks for a repeated id once', async () => {
      const { cache, calls } = world({ remote: { r: card('r') } })

      await cache.getCards(['r', 'r'])

      expect(calls.readDisk).toEqual([['r']])
      expect(calls.fetchRemote).toEqual([['r']])
    })

    it('retries an id Scryfall could not be asked about', async () => {
      // Offline or rate limited is not "this card does not exist".
      const { cache, calls, state } = world({ remote: { r: card('r') }, unreachable: ['r'] })
      const offline = await cache.getCards(['r'])
      state.unreachable.clear()

      const online = await cache.getCards(['r'])

      expect(offline.has('r')).toBe(false)
      expect(online.get('r')).toEqual(card('r'))
      expect(calls.fetchRemote).toHaveLength(2)
    })

    it('does not ask Scryfall again about an id it said does not exist', async () => {
      const { cache, calls } = world()
      await cache.getCards(['ghost'])

      const again = await cache.getCards(['ghost'])

      expect(again.has('ghost')).toBe(false)
      expect(calls.fetchRemote).toHaveLength(1)
    })

    it('still finds an unknown id on disk once something else has cached it', async () => {
      // The MCP server writes to the same disk cache while the app is open.
      const { cache, calls, state } = world()
      await cache.getCards(['late'])
      state.disk.late = card('late')

      const found = await cache.getCards(['late'])

      expect(found.get('late')).toEqual(card('late'))
      expect(calls.fetchRemote).toHaveLength(1)
    })

    it('resolves with what it has when Scryfall rejects', async () => {
      const { deps } = world({ disk: { d: card('d') } })
      const cache = createCardCache({ ...deps, fetchRemote: () => Promise.reject(new Error('boom')) })

      const found = await cache.getCards(['d', 'r'])

      expect([...found.keys()]).toEqual(['d'])
    })

    it('retries after Scryfall rejected', async () => {
      const { deps } = world()
      const fetchRemote = vi.fn<CardCacheDeps['fetchRemote']>()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ found: [card('r')], notFound: [], failed: [] })
      const cache = createCardCache({ ...deps, fetchRemote })
      await cache.getCards(['r'])

      const found = await cache.getCards(['r'])

      expect(found.has('r')).toBe(true)
    })

    it('falls through to Scryfall when the disk read rejects', async () => {
      const { deps } = world({ remote: { r: card('r') } })
      const cache = createCardCache({ ...deps, readDisk: () => Promise.reject(new Error('ipc down')) })

      const found = await cache.getCards(['r'])

      expect(found.has('r')).toBe(true)
    })

    it('still resolves when the disk write rejects', async () => {
      const { deps } = world({ remote: { r: card('r') } })
      const cache = createCardCache({ ...deps, writeDisk: () => Promise.reject(new Error('disk full')) })

      const found = await cache.getCards(['r'])

      expect(found.has('r')).toBe(true)
    })

    it('resolves to an empty map for no ids without calling anything', async () => {
      const { cache, calls } = world()

      const found = await cache.getCards([])

      expect(found.size).toBe(0)
      expect(calls.readDisk).toEqual([])
      expect(calls.fetchRemote).toEqual([])
    })
  })

  describe('getLocal', () => {
    it('never asks Scryfall', async () => {
      const { cache, calls } = world({ disk: { d: card('d') }, remote: { r: card('r') } })

      const found = await cache.getLocal(['d', 'r'])

      expect([...found.keys()]).toEqual(['d'])
      expect(calls.fetchRemote).toEqual([])
      expect(calls.writeDisk).toEqual([])
    })

    it('hands back the same card object on every call', async () => {
      // Rows are memoized on the card object; a fresh clone per read would defeat that.
      const { cache } = world({ disk: { d: card('d') } })

      const first = (await cache.getLocal(['d'])).get('d')
      const second = (await cache.getLocal(['d'])).get('d')

      expect(second).toBe(first)
    })
  })

  describe('getCard', () => {
    it('returns the card', async () => {
      const { cache } = world({ remote: { r: card('r') } })

      expect(await cache.getCard('r')).toEqual(card('r'))
    })

    it('returns null for a card nobody has', async () => {
      const { cache } = world()

      expect(await cache.getCard('ghost')).toBeNull()
    })
  })

  describe('peek', () => {
    it('is empty until a card has been loaded', async () => {
      const { cache } = world({ disk: { d: card('d') } })

      expect(cache.peek('d')).toBeUndefined()
      await cache.getLocal(['d'])
      expect(cache.peek('d')).toEqual(card('d'))
    })
  })

  describe('put', () => {
    it('makes a card available without touching disk', async () => {
      const { cache, calls } = world()

      cache.put([card('p')])

      expect(cache.peek('p')).toEqual(card('p'))
      expect(calls.writeDisk).toEqual([])
    })
  })

  describe('save', () => {
    it('makes a card available and writes it to disk', async () => {
      const { cache, calls } = world()

      await cache.save([card('s')])

      expect(cache.peek('s')).toEqual(card('s'))
      expect(calls.writeDisk).toEqual([['s']])
    })

    it('does not reject when the disk write fails', async () => {
      const { deps } = world()
      const cache = createCardCache({ ...deps, writeDisk: () => Promise.reject(new Error('disk full')) })

      await expect(cache.save([card('s')])).resolves.toBeUndefined()
      expect(cache.peek('s')).toEqual(card('s'))
    })

    it('does not write when there is nothing to save', async () => {
      const { cache, calls } = world()

      await cache.save([])

      expect(calls.writeDisk).toEqual([])
    })
  })
})

describe('toBatchResult', () => {
  it('splits a positional lookup into found and notFound', () => {
    expect(toBatchResult(['a', 'b', 'c'], [card('a'), null, card('c')])).toEqual({
      found: [card('a'), card('c')],
      notFound: ['b'],
      failed: [],
    })
  })
})

describe('createRemoteFetch', () => {
  afterEach(() => vi.useRealTimers())

  it('reports cards the lookup returned as found and nulls as notFound', async () => {
    const fetchRemote = createRemoteFetch(async ids => ids.map(id => (id === 'a' ? card('a') : null)), 1000)

    expect(await fetchRemote(['a', 'b'])).toEqual({ found: [card('a')], notFound: ['b'], failed: [] })
  })

  it('reports every id as failed, not notFound, when the lookup rejects', async () => {
    const fetchRemote = createRemoteFetch(() => Promise.reject(new Error('429')), 1000)

    expect(await fetchRemote(['a', 'b'])).toEqual({ found: [], notFound: [], failed: ['a', 'b'] })
  })

  it('reports every id as failed when the lookup takes longer than the timeout', async () => {
    vi.useFakeTimers()
    const fetchRemote = createRemoteFetch(() => new Promise(() => {}), 1000)

    const pending = fetchRemote(['a'])
    await vi.advanceTimersByTimeAsync(1000)

    expect(await pending).toEqual({ found: [], notFound: [], failed: ['a'] })
  })
})
