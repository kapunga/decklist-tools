import { describe, it, expect, vi } from 'vitest'
import { resolveImportedCards, type ImportLookupDeps } from './importLookup'
import type { ParsedCard } from '@mtg-deckbuilder/shared'
import type { ScryfallCard } from '@/types'

const parsed = (name: string, extra: Partial<ParsedCard> = {}): ParsedCard =>
  ({ name, quantity: 1, ...extra }) as ParsedCard

const scryfall = (name: string): ScryfallCard => ({
  id: `id-${name}`, name, set: 'lea', collector_number: '1', cmc: 1,
  type_line: 'Instant', color_identity: [], rarity: 'common', legalities: {},
} as ScryfallCard)

function deps(overrides: Partial<ImportLookupDeps> = {}): ImportLookupDeps {
  return {
    lookupBatch: vi.fn(async ids => ids.map(() => null)),
    lookupByName: vi.fn(async name => scryfall(name)),
    ...overrides,
  }
}

describe('resolveImportedCards', () => {
  it('builds entries for cards the batch lookup resolved', async () => {
    const result = await resolveImportedCards([parsed('Shock')], undefined, deps({
      lookupBatch: async () => [scryfall('Shock')],
    }))
    expect(result.errors).toEqual([])
    expect(result.resolvedCards).toHaveLength(1)
    expect(result.fetchedScryfallCards.map(c => c.name)).toEqual(['Shock'])
  })

  it('falls back to a per-card name lookup for batch misses', async () => {
    const d = deps()
    const result = await resolveImportedCards([parsed('Opt')], undefined, d)
    expect(d.lookupByName).toHaveBeenCalledWith('Opt')
    expect(result.resolvedCards).toHaveLength(1)
  })

  it('reports a genuine miss as "Card not found"', async () => {
    const result = await resolveImportedCards([parsed('Nonsense')], undefined, deps({
      lookupByName: async () => null,
    }))
    expect(result.errors).toEqual(['Card not found: Nonsense'])
  })

  it('surfaces a rate-limited fallback with Scryfall\'s message instead of "Card not found"', async () => {
    const result = await resolveImportedCards([parsed('Opt'), parsed('Shock')], undefined, deps({
      lookupByName: async name => {
        if (name === 'Opt') throw new Error('Rate limited by Scryfall; retry in 30s')
        return scryfall(name)
      },
    }))
    expect(result.errors).toEqual(['Could not look up Opt: Rate limited by Scryfall; retry in 30s'])
    expect(result.resolvedCards.map(r => r.card.card.name)).toEqual(['Shock'])
  })

  it('routes sideboard cards to alternates when the format has no sideboard', async () => {
    const result = await resolveImportedCards([parsed('Shock', { isSideboard: true })], 0, deps())
    expect(result.resolvedCards[0].listType).toBe('alternates')
  })
})
