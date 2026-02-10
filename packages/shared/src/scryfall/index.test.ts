import { describe, it, expect } from 'vitest'
import {
  sortColorsWUBRG,
  getCardImageUrl,
  getCardFaceImageUrl,
  formatManaCost,
  getColorIdentityString,
  WUBRG_ORDER,
} from './index.js'
import type { ScryfallCard } from '../types/index.js'

describe('WUBRG_ORDER', () => {
  it('contains all five colors in WUBRG order', () => {
    expect(WUBRG_ORDER).toEqual(['W', 'U', 'B', 'R', 'G'])
  })
})

describe('sortColorsWUBRG', () => {
  it('sorts colors in WUBRG order', () => {
    expect(sortColorsWUBRG(['G', 'W', 'R'])).toEqual(['W', 'R', 'G'])
    expect(sortColorsWUBRG(['B', 'U', 'W'])).toEqual(['W', 'U', 'B'])
    expect(sortColorsWUBRG(['R', 'G', 'B', 'U', 'W'])).toEqual(['W', 'U', 'B', 'R', 'G'])
  })

  it('handles empty array', () => {
    expect(sortColorsWUBRG([])).toEqual([])
  })

  it('handles single color', () => {
    expect(sortColorsWUBRG(['U'])).toEqual(['U'])
    expect(sortColorsWUBRG(['G'])).toEqual(['G'])
  })

  it('does not mutate the original array', () => {
    const original = ['G', 'W', 'R']
    const sorted = sortColorsWUBRG(original)
    expect(original).toEqual(['G', 'W', 'R'])
    expect(sorted).not.toBe(original)
  })
})

describe('getCardImageUrl', () => {
  const mockCard: ScryfallCard = {
    id: 'test-id',
    name: 'Test Card',
    cmc: 3,
    type_line: 'Creature',
    color_identity: [],
    set: 'test',
    collector_number: '1',
    rarity: 'common',
    legalities: {},
    image_uris: {
      small: 'https://example.com/small.jpg',
      normal: 'https://example.com/normal.jpg',
      large: 'https://example.com/large.jpg',
    },
  }

  it('returns normal size by default', () => {
    expect(getCardImageUrl(mockCard)).toBe('https://example.com/normal.jpg')
  })

  it('returns requested size', () => {
    expect(getCardImageUrl(mockCard, 'small')).toBe('https://example.com/small.jpg')
    expect(getCardImageUrl(mockCard, 'large')).toBe('https://example.com/large.jpg')
  })

  it('returns front face for DFC', () => {
    const dfcCard: ScryfallCard = {
      ...mockCard,
      image_uris: undefined,
      card_faces: [
        {
          name: 'Front Face',
          image_uris: {
            small: 'https://example.com/front-small.jpg',
            normal: 'https://example.com/front-normal.jpg',
            large: 'https://example.com/front-large.jpg',
          },
        },
        {
          name: 'Back Face',
          image_uris: {
            small: 'https://example.com/back-small.jpg',
            normal: 'https://example.com/back-normal.jpg',
            large: 'https://example.com/back-large.jpg',
          },
        },
      ],
    }
    expect(getCardImageUrl(dfcCard)).toBe('https://example.com/front-normal.jpg')
  })

  it('falls back to API URL when no images', () => {
    const noImageCard: ScryfallCard = {
      ...mockCard,
      image_uris: undefined,
    }
    expect(getCardImageUrl(noImageCard)).toBe(
      'https://api.scryfall.com/cards/test-id?format=image&version=normal'
    )
  })
})

describe('getCardFaceImageUrl', () => {
  const mockCard: ScryfallCard = {
    id: 'test-id',
    name: 'Test Card',
    cmc: 3,
    type_line: 'Creature',
    color_identity: [],
    set: 'test',
    collector_number: '1',
    rarity: 'common',
    legalities: {},
    image_uris: {
      small: 'https://example.com/small.jpg',
      normal: 'https://example.com/normal.jpg',
      large: 'https://example.com/large.jpg',
    },
  }

  it('returns main image for single-faced card face 0', () => {
    expect(getCardFaceImageUrl(mockCard, 0)).toBe('https://example.com/normal.jpg')
  })

  it('returns null for back face of single-faced card', () => {
    expect(getCardFaceImageUrl(mockCard, 1)).toBeNull()
  })

  it('returns correct face for DFC', () => {
    const dfcCard: ScryfallCard = {
      ...mockCard,
      image_uris: undefined,
      card_faces: [
        {
          name: 'Front Face',
          image_uris: {
            small: 'https://example.com/front-small.jpg',
            normal: 'https://example.com/front-normal.jpg',
            large: 'https://example.com/front-large.jpg',
          },
        },
        {
          name: 'Back Face',
          image_uris: {
            small: 'https://example.com/back-small.jpg',
            normal: 'https://example.com/back-normal.jpg',
            large: 'https://example.com/back-large.jpg',
          },
        },
      ],
    }
    expect(getCardFaceImageUrl(dfcCard, 0)).toBe('https://example.com/front-normal.jpg')
    expect(getCardFaceImageUrl(dfcCard, 1)).toBe('https://example.com/back-normal.jpg')
  })

  it('handles adventure cards with shared image_uris', () => {
    const adventureCard: ScryfallCard = {
      ...mockCard,
      card_faces: [
        { name: 'Creature Side' },
        { name: 'Adventure Side' },
      ],
    }
    expect(getCardFaceImageUrl(adventureCard, 0)).toBe('https://example.com/normal.jpg')
  })
})

describe('formatManaCost', () => {
  it('returns empty string for undefined', () => {
    expect(formatManaCost(undefined)).toBe('')
  })

  it('returns the mana cost as-is', () => {
    expect(formatManaCost('{2}{W}{U}')).toBe('{2}{W}{U}')
    expect(formatManaCost('{X}{R}{R}')).toBe('{X}{R}{R}')
  })
})

describe('getColorIdentityString', () => {
  it('returns Colorless for empty array', () => {
    expect(getColorIdentityString([])).toBe('Colorless')
  })

  it('returns Colorless for undefined-like input', () => {
    expect(getColorIdentityString(null as unknown as string[])).toBe('Colorless')
  })

  it('joins colors', () => {
    expect(getColorIdentityString(['W', 'U'])).toBe('WU')
    expect(getColorIdentityString(['R', 'G', 'B'])).toBe('RGB')
  })
})
