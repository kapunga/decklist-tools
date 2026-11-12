import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createRateLimiter,
  createScryfallTransport,
  parseRetryAfter,
  systemClock,
  type Clock,
  type RetryPolicy,
} from './transport.js'
import { ScryfallRateLimitError } from './errors.js'

/** Virtual clock: sleeps park until `runAll` advances time past them. Nothing really waits. */
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

const POLICY: RetryPolicy = { maxAttempts: 4, baseDelayMs: 1000, maxDelayMs: 10_000 }

const okResponse = () => new Response('{}', { status: 200 })
const statusResponse = (status: number, retryAfter?: string) =>
  new Response('{}', { status, headers: retryAfter ? { 'Retry-After': retryAfter } : {} })

function setup(fetchImpl: (url: string) => Promise<Response>) {
  const { clock, runAll } = virtualClock()
  const callTimes: number[] = []
  const fetch = vi.fn(async (url: string) => {
    callTimes.push(clock.now())
    return fetchImpl(url)
  })
  const transport = createScryfallTransport({
    fetch,
    clock,
    limiter: createRateLimiter(100, clock),
    retry: POLICY,
  })
  return { transport, fetch, callTimes, runAll }
}

describe('createRateLimiter', () => {
  it('spaces concurrent callers instead of releasing them together', async () => {
    const { transport, callTimes, runAll } = setup(async () => okResponse())
    const all = Promise.all(Array.from({ length: 30 }, (_, i) => transport(`u${i}`)))
    await runAll()
    await all
    expect(callTimes).toHaveLength(30)
    const gaps = callTimes.slice(1).map((t, i) => t - callTimes[i])
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(100)
    const firstSecond = callTimes.filter(t => t < callTimes[0] + 1000)
    expect(firstSecond.length).toBeLessThanOrEqual(10)
  })

  it('does not delay a request when the previous slot has already passed', async () => {
    const { clock, runAll } = virtualClock()
    const limiter = createRateLimiter(100, clock)
    const sleep = vi.spyOn(clock, 'sleep')
    const first = limiter.schedule(async () => 'a')
    await runAll()
    await first
    expect(sleep).not.toHaveBeenCalledWith(expect.any(Number))
  })

  it('holdUntil pushes every later request past the hold', async () => {
    const { clock, runAll } = virtualClock()
    const limiter = createRateLimiter(100, clock)
    limiter.holdUntil(5000)
    const startedAt = limiter.schedule(async () => clock.now())
    await runAll()
    expect(await startedAt).toBe(5000)
  })
})

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfter('2', 0)).toBe(2000)
  })

  it('reads an HTTP date relative to now', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:30 GMT', now)).toBe(30_000)
  })

  it('returns undefined for a missing or unparseable header', () => {
    expect(parseRetryAfter(null, 0)).toBeUndefined()
    expect(parseRetryAfter('soon', 0)).toBeUndefined()
  })
})

describe('createScryfallTransport retries', () => {
  it('retries a 429 after the Retry-After interval and returns the success', async () => {
    const responses = [statusResponse(429, '2'), okResponse()]
    const { transport, fetch, callTimes, runAll } = setup(async () => responses.shift()!)
    const result = transport('u')
    await runAll()
    expect((await result).status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(2000)
  })

  it('backs off exponentially on a transient 5xx without Retry-After', async () => {
    const responses = [statusResponse(503), statusResponse(502), okResponse()]
    const { transport, callTimes, runAll } = setup(async () => responses.shift()!)
    const result = transport('u')
    await runAll()
    expect((await result).status).toBe(200)
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(1000)
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(2000)
  })

  it('throws a rate-limit error naming the wait once retries are exhausted', async () => {
    const { transport, fetch, runAll } = setup(async () => statusResponse(429, '3'))
    const result = transport('u').catch(e => e)
    await runAll()
    const error = await result
    expect(fetch).toHaveBeenCalledTimes(POLICY.maxAttempts)
    expect(error).toBeInstanceOf(ScryfallRateLimitError)
    expect(error.status).toBe(429)
    expect(error.retryAfterSeconds).toBe(3)
    expect(error.message).toBe('Rate limited by Scryfall; retry in 3s')
  })

  it('fails fast when Retry-After exceeds the longest wait it will absorb', async () => {
    const { transport, fetch, runAll } = setup(async () => statusResponse(429, '60'))
    const result = transport('u').catch(e => e)
    await runAll()
    const error = await result
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(ScryfallRateLimitError)
    expect(error.message).toBe('Rate limited by Scryfall; retry in 60s')
  })

  it('returns the final 5xx response once retries are exhausted', async () => {
    const { transport, fetch, runAll } = setup(async () => statusResponse(500))
    const result = transport('u')
    await runAll()
    expect((await result).status).toBe(500)
    expect(fetch).toHaveBeenCalledTimes(POLICY.maxAttempts)
  })

  it('does not retry other client errors', async () => {
    const { transport, fetch, runAll } = setup(async () => statusResponse(404))
    const result = transport('u')
    await runAll()
    expect((await result).status).toBe(404)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('holds back concurrent callers while a 429 is being waited out', async () => {
    let first = true
    const { transport, fetch, callTimes, runAll } = setup(async () => {
      if (first) { first = false; return statusResponse(429, '2') }
      return okResponse()
    })
    const all = Promise.all([transport('a'), transport('b')])
    await runAll()
    await all
    // 'b' was already queued, yet waits out the 2s hold too, behind the retry of 'a'.
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['a', 'a', 'b'])
    expect(Math.min(...callTimes.slice(1))).toBeGreaterThanOrEqual(2000)
  })
})

describe('429 hold under fake timers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => vi.useRealTimers())

  it('pauses requests that were already queued until Retry-After has passed, keeping order', async () => {
    const sent: { url: string; at: number }[] = []
    const fetch = vi.fn(async (url: string) => {
      sent.push({ url, at: Date.now() })
      return sent.length === 3 ? statusResponse(429, '1') : okResponse()
    })
    const transport = createScryfallTransport({
      fetch,
      clock: systemClock,
      limiter: createRateLimiter(100, systemClock),
      retry: POLICY,
    })
    const urls = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']
    const resolved: string[] = []
    const all = Promise.all(urls.map(url => transport(url).then(() => { resolved.push(url) })))
    await vi.runAllTimersAsync()
    await all

    const limitedAt = sent[2].at
    expect(sent.filter(s => s.at > limitedAt && s.at < limitedAt + 1000)).toEqual([])
    expect(sent.map(s => s.url)).toEqual(['r1', 'r2', 'r3', 'r3', 'r4', 'r5', 'r6'])
    expect(resolved).toEqual(urls)
    const afterHold = sent.slice(3).map(s => s.at)
    expect(afterHold[0]).toBeGreaterThanOrEqual(limitedAt + 1000)
    expect(Math.min(...afterHold.slice(1).map((t, i) => t - afterHold[i]))).toBeGreaterThanOrEqual(100)
  })
})
