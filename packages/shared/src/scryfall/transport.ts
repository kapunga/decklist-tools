import { ScryfallRateLimitError } from './errors.js'

const USER_AGENT = 'MTGDeckbuilder/1.0'

/** Time source, injectable so tests can run on virtual time. */
export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
}

export interface ScheduleOptions {
  /** Go ahead of everything already waiting (a retry keeps its place in line). */
  first?: boolean
}

/**
 * Serialising FIFO request queue. Tasks start one at a time, at least `intervalMs` apart.
 * The start time is decided when a task reaches the head of the queue, not when it is
 * enqueued, so a hold placed while tasks are waiting applies to all of them.
 */
export interface RateLimiter {
  schedule<T>(task: () => Promise<T>, options?: ScheduleOptions): Promise<T>
  /** Start nothing before `time` (e.g. while a 429 is waited out), including tasks already queued. */
  holdUntil(time: number): void
}

export function createRateLimiter(intervalMs: number, clock: Clock): RateLimiter {
  let earliestStart = Number.NEGATIVE_INFINITY
  const waiting: (() => void)[] = []
  let draining = false

  // Sleeps again only if a hold moved the target while we slept.
  const awaitEarliestStart = async (): Promise<void> => {
    let target = Number.NEGATIVE_INFINITY
    while (earliestStart > target) {
      target = earliestStart
      const delay = target - clock.now()
      if (delay > 0) await clock.sleep(delay)
    }
  }

  const drain = async (): Promise<void> => {
    if (draining) return
    draining = true
    while (waiting.length > 0) {
      await awaitEarliestStart()
      earliestStart = clock.now() + intervalMs
      waiting.shift()!()
    }
    draining = false
  }

  const turn = (first: boolean): Promise<void> => new Promise(release => {
    if (first) waiting.unshift(release)
    else waiting.push(release)
    void drain()
  })

  return {
    async schedule(task, options) {
      await turn(options?.first ?? false)
      return task()
    },
    holdUntil(time) {
      earliestStart = Math.max(earliestStart, time)
    },
  }
}

export interface RetryPolicy {
  /** Total tries including the first. */
  maxAttempts: number
  /** Backoff for attempt n (0-based) when Scryfall sends no Retry-After: base * 2^n. */
  baseDelayMs: number
  /** Longest single wait absorbed; a longer Retry-After fails fast instead. */
  maxDelayMs: number
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

/** Parse a Retry-After header (delta-seconds or HTTP date) into milliseconds from `now`. */
export function parseRetryAfter(header: string | null, now: number): number | undefined {
  if (!header) return undefined
  const trimmed = header.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000
  const date = Date.parse(trimmed)
  return Number.isNaN(date) ? undefined : Math.max(0, date - now)
}

export interface ScryfallRequestInit {
  method?: string
  headers?: Record<string, string>
  body?: string
}

export type FetchFn = (url: string, init?: ScryfallRequestInit) => Promise<Response>

/** Rate-limited, retrying fetch for the Scryfall API. */
export type ScryfallTransport = FetchFn

export interface ScryfallTransportDeps {
  fetch: FetchFn
  clock: Clock
  limiter: RateLimiter
  retry: RetryPolicy
}

const withUserAgent = (init?: ScryfallRequestInit): ScryfallRequestInit => ({
  ...init,
  headers: { 'User-Agent': USER_AGENT, ...init?.headers },
})

const retryDelay = (response: Response, attempt: number, deps: ScryfallTransportDeps): number =>
  parseRetryAfter(response.headers.get('Retry-After'), deps.clock.now())
    ?? deps.retry.baseDelayMs * 2 ** attempt

const discardBody = (response: Response): void => {
  response.body?.cancel().catch(() => undefined)
}

/** Out of retries: a 429 becomes a rate-limit error; any other status goes back to the caller. */
function giveUp(response: Response, delayMs: number): Response {
  if (response.status !== 429) return response
  discardBody(response)
  throw new ScryfallRateLimitError(Math.ceil(delayMs / 1000))
}

/**
 * Wrap `fetch` so every request goes through the shared limiter, and 429 / transient
 * 5xx responses are retried with backoff (honouring Retry-After) up to `maxAttempts`.
 * While a retry waits, the limiter is held so concurrent callers back off too.
 */
export function createScryfallTransport(deps: ScryfallTransportDeps): ScryfallTransport {
  const attempt = async (url: string, init: ScryfallRequestInit, n: number): Promise<Response> => {
    const response = await deps.limiter.schedule(() => deps.fetch(url, init), { first: n > 0 })
    if (!RETRYABLE_STATUSES.has(response.status)) return response

    const delay = retryDelay(response, n, deps)
    const canRetry = n + 1 < deps.retry.maxAttempts && delay <= deps.retry.maxDelayMs
    if (!canRetry) return giveUp(response, delay)

    discardBody(response)
    deps.limiter.holdUntil(deps.clock.now() + delay)
    return attempt(url, init, n + 1)
  }

  return (url, init) => attempt(url, withUserAgent(init), 0)
}

/** Production transport: real clock, global fetch (read at call time), shared limiter. */
export function createDefaultScryfallTransport(minIntervalMs: number): ScryfallTransport {
  return createScryfallTransport({
    fetch: (url, init) => fetch(url, init),
    clock: systemClock,
    limiter: createRateLimiter(minIntervalMs, systemClock),
    retry: DEFAULT_RETRY_POLICY,
  })
}
