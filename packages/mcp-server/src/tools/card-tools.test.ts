import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createRateLimiter,
  createScryfallTransport,
  setScryfallTransport,
  type Clock,
} from '@mtg-deckbuilder/shared'
import { looksLikeSearchSyntax, searchCardsHandler } from './card-tools.js'
import { resetCachedScryfallClient } from './helpers.js'
import { createMockStorage, mockScryfallCard } from '../__test__/helpers.js'

describe('looksLikeSearchSyntax', () => {
  it.each([
    't:instant c:red cmc<=1',
    '(t:instant',
    'froobinator:yes',
    '-t:land',
    't:land -is:basic',
    'cmc<<2',
    'pow>=4',
    'mv=3',
    'name:"Lightning Bolt"',
    '!"Lightning Bolt"',
    '"lightning bolt"',
    '(t:instant or t:sorcery)',
  ])('treats %j as search syntax', query => {
    expect(looksLikeSearchSyntax(query)).toBe(true)
  })

  it.each([
    'Lightning Bolt',
    'Jace, the Mind Sculptor',
    "Will-o'-the-Wisp",
    "Urza's Saga",
    'Fire // Ice',
    'Sephiroth',
    'Æther Vial',
    'She said "hi"',
    'Circle of Protection: Red',
  ])('treats %j as a card name', query => {
    expect(looksLikeSearchSyntax(query)).toBe(false)
  })
})

describe('searchCardsHandler network behaviour', () => {
  const bolt = mockScryfallCard('Lightning Bolt', { id: '11111111-1111-4111-8111-111111111111' })
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

  /** Virtual clock: sleeps park until `runAll` advances time past them, so nothing really waits. */
  function virtualClock() {
    let time = 0
    const timers: { at: number; resolve: () => void }[] = []
    const flush = () => new Promise<void>(resolve => setImmediate(resolve))
    const clock: Clock = {
      now: () => time,
      sleep: ms => ms <= 0
        ? Promise.resolve()
        : new Promise<void>(resolve => { timers.push({ at: time + ms, resolve }) }),
    }
    async function runAll(): Promise<void> {
      await flush()
      while (timers.length > 0) {
        timers.sort((a, b) => a.at - b.at)
        const next = timers.shift()!
        time = Math.max(time, next.at)
        next.resolve()
        await flush()
      }
    }
    return { clock, runAll }
  }

  /** Run a handler call to completion, advancing virtual time as needed. */
  async function settle<T>(promise: Promise<T>): Promise<T> {
    await runAll()
    return promise
  }

  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>
  let callTimes: number[]
  let runAll: () => Promise<void>

  beforeEach(() => {
    resetCachedScryfallClient()
    callTimes = []
    const virtual = virtualClock()
    const clock = virtual.clock
    runAll = virtual.runAll
    fetchMock = vi.fn(async (url: string) => {
      callTimes.push(clock.now())
      return url.includes('/cards/search')
        ? json(200, { object: 'list', total_cards: 1, has_more: false, data: [bolt] })
        : json(200, bolt)
    })
    setScryfallTransport(createScryfallTransport({
      fetch: fetchMock,
      clock,
      limiter: createRateLimiter(100, clock),
      retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10_000 },
    }))
  })

  afterEach(() => {
    setScryfallTransport()
    resetCachedScryfallClient()
  })

  it('serves a repeat name lookup from the card cache with zero network calls', async () => {
    const { storage } = createMockStorage()
    await searchCardsHandler(storage, { query: 'Lightning Bolt' })
    await searchCardsHandler(storage, { query: 'Lightning Bolt' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves a repeat id lookup from the card cache with zero network calls', async () => {
    const { storage } = createMockStorage()
    await searchCardsHandler(storage, { query: bolt.id })
    await searchCardsHandler(storage, { query: bolt.id })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caches cards returned by a syntax search for later name lookups', async () => {
    const { storage } = createMockStorage()
    await searchCardsHandler(storage, { query: 't:instant c:red' })
    await searchCardsHandler(storage, { query: 'Lightning Bolt' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('spaces 12 concurrent distinct lookups to at most 10 requests per second', async () => {
    const { storage } = createMockStorage()
    await settle(Promise.all(Array.from({ length: 12 }, (_, i) =>
      searchCardsHandler(storage, { query: `Card Number ${i}` }))))
    expect(callTimes).toHaveLength(12)
    const gaps = callTimes.slice(1).map((t, i) => t - callTimes[i])
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(100)
  })

  it('reports an exhausted rate limit instead of "Card not found"', async () => {
    fetchMock.mockImplementation(async () =>
      new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))
    const { storage } = createMockStorage()
    const pending = searchCardsHandler(storage, { query: 'Lightning Bolt' }).catch(e => e)
    await expect(settle(pending).then(e => { throw e }))
      .rejects.toThrow(/Rate limited by Scryfall; retry in \d+s/)
  })
})
