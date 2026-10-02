import { describe, it, expect } from 'vitest'
import { normalizeFilters, FilterError } from './normalize.js'

const filter = (type: string, values: unknown[], mode = 'include') => ({ type, mode, values })

describe('normalizeFilters', () => {
  it('passes undefined through so "no filters" stays distinguishable', () => {
    expect(normalizeFilters(undefined)).toBeUndefined()
  })

  it.each(['land', 'LAND', 'Land', ' land '])('canonicalises card-type %j', value => {
    expect(normalizeFilters([filter('card-type', [value])])).toEqual([filter('card-type', ['Land'])])
  })

  it('uppercases colors', () => {
    expect(normalizeFilters([filter('color', ['w', 'u'])])).toEqual([filter('color', ['W', 'U'])])
  })

  it('lowercases ownership', () => {
    expect(normalizeFilters([filter('ownership', ['Need_To_Buy'])])).toEqual([filter('ownership', ['need_to_buy'])])
  })

  it('coerces numeric strings for cmc', () => {
    expect(normalizeFilters([filter('cmc', ['3', 4])])).toEqual([filter('cmc', [3, 4])])
  })

  it('leaves role ids untouched, since roles are user-defined', () => {
    expect(normalizeFilters([filter('role', ['Ramp', 'custom-role'])])).toEqual([filter('role', ['Ramp', 'custom-role'])])
  })

  it('keeps mode', () => {
    expect(normalizeFilters([filter('card-type', ['land'], 'exclude')])?.[0].mode).toBe('exclude')
  })

  it('rejects an unknown card-type naming the valid values', () => {
    expect(() => normalizeFilters([filter('card-type', ['lnad'])]))
      .toThrow(/"lnad".*Valid values: Creature, .*Land/)
  })

  it('rejects an unknown color', () => {
    expect(() => normalizeFilters([filter('color', ['red'])])).toThrow(/Valid values: W, U, B, R, G, C/)
  })

  it('rejects an unknown ownership', () => {
    expect(() => normalizeFilters([filter('ownership', ['mine'])])).toThrow(/unknown, owned, need_to_buy/)
  })

  it.each([['abc'], [8], [-1], [2.5], [null]])('rejects cmc value %j', value => {
    expect(() => normalizeFilters([filter('cmc', [value])])).toThrow(/integers 0-7/)
  })

  it('rejects an unknown filter type', () => {
    expect(() => normalizeFilters([filter('rarity', ['rare'])])).toThrow(/Unknown filter type "rarity".*cmc, color, card-type, role, ownership/)
  })

  it('rejects an invalid mode', () => {
    expect(() => normalizeFilters([filter('color', ['W'], 'only')])).toThrow(/include, exclude/)
  })

  it('rejects non-array filters and non-array values', () => {
    expect(() => normalizeFilters('land')).toThrow(FilterError)
    expect(() => normalizeFilters([{ type: 'color', mode: 'include', values: 'W' }])).toThrow(/values must be an array/)
  })
})
