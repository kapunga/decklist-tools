import * as fs from 'fs'
import * as path from 'path'
import { getOracleText, type ScryfallCard } from '../types/index.js'
import { setDeckLimits } from '../cards/deck-limits.js'
import { searchCardsAll } from './index.js'

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
}

const ANY_NUMBER_RE = /A deck can have any number of cards? named /i
const UP_TO_N_RE = /A deck can have up to (\w+) cards? named /i

// Hardcoded fallback — used only when both disk cache and Scryfall fetch fail.
// Regenerate via Scryfall query: o:"A deck can have"
export const FALLBACK_DECK_LIMITS: ReadonlyArray<readonly [string, number]> = [
  ['Cid, Timeless Artificer', Infinity],
  ["Dragon's Approach", Infinity],
  ['Hare Apparent', Infinity],
  ['Persistent Petitioners', Infinity],
  ['Rat Colony', Infinity],
  ['Relentless Rats', Infinity],
  ['Shadowborn Apostle', Infinity],
  ['Slime Against Humanity', Infinity],
  ['Tempest Hawk', Infinity],
  ['Templar Knight', Infinity],
  ['Nazgûl', 9],
  ['Seven Dwarves', 7],
]

export function getIntrinsicDeckLimit(card: ScryfallCard): number | null {
  const text = getOracleText(card) ?? ''
  if (ANY_NUMBER_RE.test(text)) return Infinity
  const m = UP_TO_N_RE.exec(text)
  if (!m) return null
  const n = NUMBER_WORDS[m[1].toLowerCase()]
  return n ?? null
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheFile {
  fetchedAt: string
  entries: Array<[string, number | 'Infinity']>
}

function serializeEntries(entries: ReadonlyArray<readonly [string, number]>): Array<[string, number | 'Infinity']> {
  return entries.map(([name, limit]) => [name, limit === Infinity ? 'Infinity' : limit])
}

function deserializeEntries(serialized: Array<[string, number | 'Infinity']>): Array<[string, number]> {
  return serialized.map(([name, limit]) => [name, limit === 'Infinity' ? Infinity : limit])
}

interface ReadCacheResult {
  entries: Array<[string, number]>
  fresh: boolean
}

function readCache(cachePath: string): ReadCacheResult | null {
  try {
    if (!fs.existsSync(cachePath)) return null
    const raw = fs.readFileSync(cachePath, 'utf-8')
    const parsed = JSON.parse(raw) as CacheFile
    if (!parsed?.entries || !Array.isArray(parsed.entries)) return null
    const fetchedAt = parsed.fetchedAt ? Date.parse(parsed.fetchedAt) : NaN
    const fresh = Number.isFinite(fetchedAt) && Date.now() - fetchedAt < CACHE_TTL_MS
    return { entries: deserializeEntries(parsed.entries), fresh }
  } catch {
    return null
  }
}

function writeCache(cachePath: string, entries: ReadonlyArray<readonly [string, number]>): void {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true })
    const payload: CacheFile = {
      fetchedAt: new Date().toISOString(),
      entries: serializeEntries(entries),
    }
    fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[deck-limits] failed to write cache:', err)
  }
}

async function fetchFromScryfall(): Promise<Array<[string, number]> | null> {
  try {
    const cards = await searchCardsAll('o:"A deck can have" unique:cards')
    const entries: Array<[string, number]> = []
    for (const card of cards) {
      const limit = getIntrinsicDeckLimit(card)
      if (limit !== null) entries.push([card.name, limit])
    }
    return entries.length > 0 ? entries : null
  } catch (err) {
    console.warn('[deck-limits] Scryfall fetch failed:', err)
    return null
  }
}

// TODO: surface load failures through a proper telemetry/error channel rather than
// console.warn — stderr-only output is easy to miss in both the Electron main process
// and the MCP stdio server.
export async function loadCardDeckLimits(opts: { cachePath?: string } = {}): Promise<void> {
  const { cachePath } = opts
  const cached = cachePath ? readCache(cachePath) : null

  // Warm start from disk cache regardless of freshness.
  if (cached && cached.entries.length > 0) {
    setDeckLimits(cached.entries)
  }

  // Skip the network if the cache is still within TTL.
  if (cached?.fresh) return

  // Fresh pull from Scryfall.
  const fresh = await fetchFromScryfall()
  if (fresh) {
    setDeckLimits(fresh)
    if (cachePath) writeCache(cachePath, fresh)
    return
  }

  // Fall back only if nothing was loaded from cache either.
  if (!cached) {
    setDeckLimits(FALLBACK_DECK_LIMITS)
  }
}
