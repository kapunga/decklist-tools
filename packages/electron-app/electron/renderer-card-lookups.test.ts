import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Lives under electron/ because it needs Node's fs, which the renderer's TypeScript
// project has no types for.
//
// The renderer has one door to card data: the card cache (memory, then disk, then one
// batched Scryfall request). A raw per-card fetch skips all three, and a few of them in
// a loop is what made the deck list fire a request per mainboard card. This scan keeps
// a new one from slipping back in.

const SRC = fileURLToPath(new URL('../src', import.meta.url))

const isSource = (name: string): boolean =>
  /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return isSource(entry.name) ? [path] : []
  })

const filesMentioning = (needle: string): string[] =>
  sourceFiles(SRC)
    .filter(path => readFileSync(path, 'utf8').includes(needle))
    .map(path => relative(SRC, path))
    .sort()

describe('card lookups in the renderer', () => {
  it('never fetch a single card straight from Scryfall', () => {
    expect(filesMentioning('getCardById')).toEqual([])
  })

  it('reach the disk cache only through the card cache instance', () => {
    expect(filesMentioning('getCachedCards')).toEqual(['lib/cardCacheInstance.ts'])
    expect(filesMentioning('saveCachedCards')).toEqual(['lib/cardCacheInstance.ts'])
  })
})
