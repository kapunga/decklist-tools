import { describe, it, expect } from 'vitest'
import type { ScryfallCard } from '@/types'
import { buyListIdsKey, pricesByCardName } from './buyListPrices'

const priced = (id: string, usd: string): ScryfallCard => ({ id, prices: { usd } }) as ScryfallCard

describe('buyListIdsKey', () => {
  it('is the sorted, de-duplicated ids, skipping items without one', () => {
    const items = [{ scryfallId: 'b' }, { scryfallId: undefined }, { scryfallId: 'a' }, { scryfallId: 'b' }]

    expect(buyListIdsKey(items)).toBe('a,b')
  })

  it('is empty for an empty list', () => {
    expect(buyListIdsKey([])).toBe('')
  })
})

describe('pricesByCardName', () => {
  it('keys each price by lower-cased card name', () => {
    const items = [{ cardName: 'Sol Ring', scryfallId: 's' }, { cardName: 'Arcane Signet', scryfallId: 'a' }]

    const prices = pricesByCardName(items, [priced('a', '0.50'), priced('s', '1.25')])

    expect(prices['sol ring'].usd).toBe('1.25')
    expect(prices['arcane signet'].usd).toBe('0.50')
  })

  it('leaves out items whose card was not returned', () => {
    const items = [{ cardName: 'Sol Ring', scryfallId: 's' }, { cardName: 'Mystery', scryfallId: 'm' }]

    expect(Object.keys(pricesByCardName(items, [priced('s', '1.25')]))).toEqual(['sol ring'])
  })

  it('leaves out items with no scryfall id', () => {
    expect(pricesByCardName([{ cardName: 'Sol Ring' }], [priced('s', '1.25')])).toEqual({})
  })
})
