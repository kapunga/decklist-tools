import { describe, it, expect } from 'vitest'
import { createCardIdentifier } from './identifiers.js'
import type { ScryfallCard } from '../types/index.js'

const baseCard: ScryfallCard = {
  id: 'abc-123',
  name: 'Sol Ring',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  set: 'c21',
  collector_number: '263',
  rarity: 'uncommon',
  legalities: {},
}

describe('createCardIdentifier', () => {
  it('carries every relevant field from a fully-populated ScryfallCard', () => {
    const card: ScryfallCard = {
      ...baseCard,
      id: 'xyz-789',
      name: 'Atraxa, Praetors\' Voice',
      flavor_name: 'Atraxa, Grand Unifier',
      color_identity: ['W', 'U', 'B', 'G'],
      set: 'one',
      collector_number: '196',
    }

    expect(createCardIdentifier(card)).toEqual({
      scryfallId: 'xyz-789',
      name: 'Atraxa, Praetors\' Voice',
      flavorName: 'Atraxa, Grand Unifier',
      setCode: 'one',
      collectorNumber: '196',
      colorIdentity: ['W', 'U', 'B', 'G'],
    })
  })

  it('leaves flavorName undefined when the card has no flavor_name', () => {
    const result = createCardIdentifier(baseCard)
    expect(result.flavorName).toBeUndefined()
    expect('flavorName' in result).toBe(true)
  })

  it('preserves an empty color_identity array (colorless cards)', () => {
    expect(createCardIdentifier(baseCard).colorIdentity).toEqual([])
  })

  it('lets overrides win over the card\'s own setCode and collectorNumber', () => {
    const result = createCardIdentifier(baseCard, {
      setCode: 'mh3',
      collectorNumber: '42',
    })
    expect(result.setCode).toBe('mh3')
    expect(result.collectorNumber).toBe('42')
  })

  it('falls through to the card\'s values when overrides are undefined', () => {
    const result = createCardIdentifier(baseCard, { setCode: undefined })
    expect(result.setCode).toBe('c21')
    expect(result.collectorNumber).toBe('263')
  })

  it('treats empty-string overrides as fall-through (parser compatibility)', () => {
    const result = createCardIdentifier(baseCard, {
      setCode: '',
      collectorNumber: '',
    })
    expect(result.setCode).toBe('c21')
    expect(result.collectorNumber).toBe('263')
  })

  it('mixes overridden and fall-through fields independently', () => {
    const result = createCardIdentifier(baseCard, { setCode: 'mh3' })
    expect(result.setCode).toBe('mh3')
    expect(result.collectorNumber).toBe('263')
  })
})
