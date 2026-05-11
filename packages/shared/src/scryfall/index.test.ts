import { describe, it, expect } from 'vitest'
import {
  sortColorsWUBRG,
  getCardImageUrl,
  getCardFaceImageUrl,
  formatManaCost,
  getColorIdentityString,
  buildArtCropUrlFromId,
  listLegalities,
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

describe('buildArtCropUrlFromId', () => {
  // Real id from Sephiroth, Fabled SOLDIER (a transform card) — empirically
  // verified to return both /front/ and /back/ art_crops at this URL pattern.
  const sephirothId = '85eaf5e7-77dc-4842-a70c-ce4ac7f724df'

  it('defaults to the front face when no face is given', () => {
    expect(buildArtCropUrlFromId(sephirothId)).toBe(
      'https://cards.scryfall.io/art_crop/front/8/5/85eaf5e7-77dc-4842-a70c-ce4ac7f724df.jpg',
    )
  })

  it('returns the front URL when face is explicitly "front"', () => {
    expect(buildArtCropUrlFromId(sephirothId, 'front')).toBe(
      'https://cards.scryfall.io/art_crop/front/8/5/85eaf5e7-77dc-4842-a70c-ce4ac7f724df.jpg',
    )
  })

  it('returns the back URL when face is "back"', () => {
    expect(buildArtCropUrlFromId(sephirothId, 'back')).toBe(
      'https://cards.scryfall.io/art_crop/back/8/5/85eaf5e7-77dc-4842-a70c-ce4ac7f724df.jpg',
    )
  })

  it('splits the first two characters of the id into directory segments', () => {
    // Different leading chars to confirm c1/c2 indexing isn't hardcoded.
    expect(buildArtCropUrlFromId('ab74e12a-ad7c-4563-aa06-632654bac91d')).toBe(
      'https://cards.scryfall.io/art_crop/front/a/b/ab74e12a-ad7c-4563-aa06-632654bac91d.jpg',
    )
  })

  it('produces distinct URLs for front and back of the same id', () => {
    const front = buildArtCropUrlFromId(sephirothId, 'front')
    const back = buildArtCropUrlFromId(sephirothId, 'back')
    expect(front).not.toBe(back)
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

describe('listLegalities', () => {
  function card(legalities: Record<string, string>): ScryfallCard {
    return { id: 'x', name: 'Test', cmc: 0, type_line: '', color_identity: [], colors: [], set: 'x', collector_number: '0', rarity: 'common', mana_cost: '', oracle_text: '', legalities }
  }

  it('empty input returns empty arrays', () => {
    expect(listLegalities([])).toEqual({ intersection: [], someLegal: [], someBanned: [] })
  })

  it('intersection captures formats every card is legal in', () => {
    const result = listLegalities([
      card({ standard: 'legal', modern: 'legal' }),
      card({ standard: 'legal', modern: 'not_legal' }),
    ])
    expect(result.intersection).toEqual(['standard'])
  })

  it('someLegal is disjoint from intersection', () => {
    const result = listLegalities([
      card({ standard: 'legal', modern: 'legal' }),
      card({ standard: 'legal', modern: 'not_legal' }),
    ])
    expect(result.intersection).toContain('standard')
    expect(result.someLegal).not.toContain('standard')
    expect(result.someLegal).toContain('modern')
  })

  it('someBanned surfaces explicit ban only', () => {
    const result = listLegalities([
      card({ modern: 'banned', legacy: 'not_legal' }),
    ])
    expect(result.someBanned).toContain('modern')
    expect(result.someBanned).not.toContain('legacy')
  })

  it('a banned card can also have someLegal in other formats', () => {
    const result = listLegalities([
      card({ modern: 'banned', commander: 'legal' }),
      card({ modern: 'legal', commander: 'legal' }),
    ])
    expect(result.someBanned).toContain('modern')
    expect(result.intersection).toContain('commander')
    expect(result.someLegal).toContain('modern')
  })
})
