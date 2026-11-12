import { describe, it, expect } from 'vitest'
import {
  getCardTypeLine,
  getTypeLine,
  resolvePrimaryType,
  getEntryPrimaryType,
  isLandPrimaryType,
  isLandEntry,
  getCardManaValue,
} from './classification.js'
import { getPrimaryType } from '../constants/index.js'
import type { CardEntry, ScryfallCard } from '../types/index.js'

function makeEntry(name: string, overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: `test-${name}`,
    card: { name, setCode: 'test', collectorNumber: '1', scryfallId: `sf-${name}` },
    quantity: 1,
    ownership: 'unknown',
    roles: [],
    source: 'user',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeCard(name: string, overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return { id: `sf-${name}`, name, cmc: 0, type_line: 'Artifact', ...overrides } as ScryfallCard
}

function cacheOf(...cards: ScryfallCard[]): Map<string, ScryfallCard> {
  return new Map(cards.map(c => [c.id, c]))
}

describe('getPrimaryType', () => {
  it.each([
    ['Legendary Creature — Human Pirate', 'Creature'],
    ['Basic Land — Forest', 'Land'],
    ['Instant', 'Instant'],
    // Artifact and enchantment lands are lands first
    ['Artifact Land', 'Land'],
    ['Legendary Enchantment Land — Urza’s Saga', 'Land'],
    // A creature land is a creature (Dryad Arbor)
    ['Land Creature — Forest Dryad', 'Creature'],
  ])('classifies single-faced %s as %s', (typeLine, expected) => {
    expect(getPrimaryType(typeLine)).toBe(expected)
  })

  it.each([
    // transform: noncreature front, creature back
    ['Sorcery // Enchantment Creature — Saga Human', 'Sorcery'],
    // transform: land front, artifact back (Balamb Garden)
    ['Land — Town // Legendary Artifact — Vehicle', 'Land'],
    // transform: artifact front, land back (Treasure Map)
    ['Artifact // Land', 'Artifact'],
    // modal_dfc: spell front, land back
    ['Sorcery // Land', 'Sorcery'],
    // modal_dfc: land front
    ['Land // Land', 'Land'],
    // adventure / omen
    ['Creature — Giant // Sorcery — Adventure', 'Creature'],
    ['Instant // Instant', 'Instant'],
  ])('classifies double-faced %s by its front face as %s', (typeLine, expected) => {
    expect(getPrimaryType(typeLine)).toBe(expected)
  })
})

describe('getCardTypeLine', () => {
  it('uses the top-level type line when present', () => {
    expect(getCardTypeLine(makeCard('Sol Ring', { type_line: 'Artifact' }))).toBe('Artifact')
  })

  it('falls back to the first face for reversible cards with no top-level type line', () => {
    const card = makeCard('Mountain', {
      type_line: undefined as unknown as string,
      layout: 'reversible_card',
      card_faces: [
        { name: 'Mountain', type_line: 'Basic Land — Mountain' },
        { name: 'Mountain', type_line: 'Basic Land — Mountain' },
      ],
    })
    expect(getCardTypeLine(card)).toBe('Basic Land — Mountain')
  })
})

describe('getTypeLine', () => {
  it('returns the cached type line when the cache has it', () => {
    const entry = makeEntry('Sol Ring')
    expect(getTypeLine(entry, cacheOf(makeCard('Sol Ring')))).toBe('Artifact')
  })

  it('returns undefined when the cache has no entry for the scryfallId', () => {
    expect(getTypeLine(makeEntry('Sol Ring'), new Map())).toBeUndefined()
  })

  it('returns undefined when the card has no scryfallId', () => {
    const entry = makeEntry('Sol Ring', { card: { name: 'Sol Ring', setCode: 'lea', collectorNumber: '270' } })
    expect(getTypeLine(entry, new Map())).toBeUndefined()
  })
})

describe('resolvePrimaryType', () => {
  it('prefers the stored primaryType over the Scryfall card', () => {
    const entry = makeEntry('Adewale', { primaryType: 'Creature' })
    expect(resolvePrimaryType(entry, makeCard('Adewale', { type_line: 'Instant' }))).toBe('Creature')
  })

  it('falls back to the front face of the Scryfall card', () => {
    const card = makeCard('Esper Origins', { type_line: 'Sorcery // Enchantment Creature — Saga Human' })
    expect(resolvePrimaryType(makeEntry('Esper Origins'), card)).toBe('Sorcery')
  })

  it("defaults to 'Other' when neither is available", () => {
    expect(resolvePrimaryType(makeEntry('Mystery'), undefined)).toBe('Other')
  })
})

describe('getEntryPrimaryType', () => {
  it('uses the stored primaryType for an uncached card', () => {
    const entry = makeEntry('Rakish Crew', { primaryType: 'Enchantment' })
    expect(getEntryPrimaryType(entry, new Map())).toBe('Enchantment')
  })

  it('classifies from the cache when nothing is stored', () => {
    const card = makeCard('Balamb Garden', { type_line: 'Land — Town // Legendary Artifact — Vehicle' })
    expect(getEntryPrimaryType(makeEntry('Balamb Garden'), cacheOf(card))).toBe('Land')
  })
})

describe('isLandPrimaryType', () => {
  it('is true only for Land', () => {
    expect(isLandPrimaryType('Land')).toBe(true)
    expect(isLandPrimaryType('Artifact')).toBe(false)
    expect(isLandPrimaryType('Other')).toBe(false)
  })
})

describe('isLandEntry', () => {
  const cache = cacheOf(
    makeCard('Treasure Map', { type_line: 'Artifact // Land', layout: 'transform' }),
    makeCard('Balamb Garden', { type_line: 'Land — Town // Legendary Artifact — Vehicle', layout: 'transform' }),
    makeCard('Dryad Arbor', { type_line: 'Land Creature — Forest Dryad' }),
    makeCard('Shatterskull Smashing', { type_line: 'Sorcery // Land', layout: 'modal_dfc' }),
  )

  it.each([
    ['Treasure Map', false],
    ['Balamb Garden', true],
    ['Dryad Arbor', false],
    ['Shatterskull Smashing', false],
  ])('%s is a land: %s', (name, expected) => {
    expect(isLandEntry(makeEntry(name), cache)).toBe(expected)
  })

  it('trusts a stored Land primaryType for an uncached card', () => {
    expect(isLandEntry(makeEntry('Uncached Land', { primaryType: 'Land' }), new Map())).toBe(true)
  })
})

describe('getCardManaValue', () => {
  it('returns the top-level cmc', () => {
    expect(getCardManaValue(makeCard('Treasure Map', { cmc: 2 }))).toBe(2)
  })

  it('falls back to the first face for reversible cards with no top-level cmc', () => {
    const card = makeCard('Reversible', {
      cmc: undefined as unknown as number,
      card_faces: [
        { name: 'Reversible', type_line: 'Creature', cmc: 3 },
        { name: 'Reversible', type_line: 'Creature', cmc: 3 },
      ],
    })
    expect(getCardManaValue(card)).toBe(3)
  })

  it('returns undefined when there is no card', () => {
    expect(getCardManaValue(undefined)).toBeUndefined()
  })
})
