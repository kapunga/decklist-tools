import { describe, it, expect } from 'vitest'
import type { PullListItem } from '../types/index.js'
import { buildSetNameResolver, groupPullListItems, pullListGroupHeading } from './pull-list.js'

const item = (overrides: Partial<PullListItem>): PullListItem => ({
  cardName: 'Card',
  setCode: 'abc',
  setName: 'Alpha Beta Cee',
  collectorNumber: '1',
  rarity: 'common',
  typeLine: 'Instant',
  manaCost: '{U}',
  cmc: 1,
  quantityNeeded: 1,
  quantityPulledThisPrint: 0,
  quantityPulledTotal: 0,
  remainingNeeded: 1,
  ...overrides,
})

const byName = (a: PullListItem, b: PullListItem) => a.cardName.localeCompare(b.cardName)

describe('buildSetNameResolver', () => {
  const resolve = buildSetNameResolver(
    [{ setCode: 'GRN', setName: 'Guilds of Ravnica' }],
    [{ set: '2xm', set_name: 'Double Masters' }, { set: 'grn', set_name: 'Ignored Name' }, { set: 'xyz' }],
  )

  it('prefers the collection name, case-insensitively', () => {
    expect(resolve('grn')).toBe('Guilds of Ravnica')
  })

  it('falls back to the cached card set_name', () => {
    expect(resolve('2XM')).toBe('Double Masters')
  })

  it('falls back to the uppercased code when nothing is known', () => {
    expect(resolve('xyz')).toBe('XYZ')
    expect(resolve('clb')).toBe('CLB')
  })
})

describe('groupPullListItems', () => {
  it('keeps distinct not-in-collection sets in separate, distinctly labelled groups', () => {
    const groups = groupPullListItems(
      [
        item({ cardName: 'A', setCode: 'hob', setName: 'Hobbit', notInCollection: true }),
        item({ cardName: 'B', setCode: 'msc', setName: 'Misc Set', notInCollection: true }),
      ],
      byName,
    )
    const headings = groups.map(pullListGroupHeading)
    expect(headings).toEqual(['Hobbit — not in collection', 'Misc Set — not in collection'])
    expect(new Set(headings).size).toBe(headings.length)
  })

  it('does not merge owned and not-in-collection items of the same set', () => {
    const groups = groupPullListItems(
      [item({ cardName: 'A', setCode: 'abc' }), item({ cardName: 'B', setCode: 'abc', notInCollection: true })],
      byName,
    )
    expect(groups.map(pullListGroupHeading)).toEqual(['Alpha Beta Cee', 'Alpha Beta Cee — not in collection'])
  })

  it('sorts items within a group using the comparator and does not mutate input', () => {
    const items = [item({ cardName: 'Z' }), item({ cardName: 'A' })]
    const groups = groupPullListItems(items, byName)
    expect(groups[0].items.map(i => i.cardName)).toEqual(['A', 'Z'])
    expect(items.map(i => i.cardName)).toEqual(['Z', 'A'])
  })

  it('orders owned groups before not-in-collection groups', () => {
    const groups = groupPullListItems(
      [item({ setCode: 'aaa', setName: 'Aardvark', notInCollection: true }), item({ setCode: 'zzz', setName: 'Zebra' })],
      byName,
    )
    expect(groups.map(g => g.setCode)).toEqual(['zzz', 'aaa'])
  })
})
