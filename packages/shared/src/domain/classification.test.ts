import { describe, it, expect } from 'vitest'
import {
  getCardTypeLine,
  getTypeLine,
  resolvePrimaryType,
  getEntryPrimaryType,
  isLandPrimaryType,
  isLandEntry,
  getCardManaValue,
  getCardManaCost,
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

// Fixtures modelled on Scryfall's JSON: two-image layouts (transform,
// modal_dfc) omit the top-level `mana_cost`; one-image multi-part layouts
// (split, adventure, flip) keep a top-level one.
const vincentValentine = makeCard('Vincent Valentine // Galian Beast', {
  layout: 'transform',
  cmc: 4,
  type_line: 'Legendary Creature — Human Assassin // Legendary Creature — Werewolf Beast',
  card_faces: [
    { name: 'Vincent Valentine', mana_cost: '{2}{B}{B}', type_line: 'Legendary Creature — Human Assassin' },
    { name: 'Galian Beast', mana_cost: '', type_line: 'Legendary Creature — Werewolf Beast' },
  ],
})

const shatterskullSmashing = makeCard('Shatterskull Smashing // Shatterskull, the Hammer Pass', {
  layout: 'modal_dfc',
  cmc: 2,
  type_line: 'Sorcery // Land',
  card_faces: [
    { name: 'Shatterskull Smashing', mana_cost: '{X}{R}{R}', type_line: 'Sorcery' },
    { name: 'Shatterskull, the Hammer Pass', mana_cost: '', type_line: 'Land' },
  ],
})

const fireIce = makeCard('Fire // Ice', {
  layout: 'split',
  cmc: 4,
  mana_cost: '{1}{R} // {1}{U}',
  type_line: 'Instant // Instant',
  card_faces: [
    { name: 'Fire', mana_cost: '{1}{R}', type_line: 'Instant' },
    { name: 'Ice', mana_cost: '{1}{U}', type_line: 'Instant' },
  ],
})

const bonecrusherGiant = makeCard('Bonecrusher Giant // Stomp', {
  layout: 'adventure',
  cmc: 3,
  mana_cost: '{2}{R} // {1}{R}',
  type_line: 'Creature — Giant // Instant — Adventure',
  card_faces: [
    { name: 'Bonecrusher Giant', mana_cost: '{2}{R}', type_line: 'Creature — Giant' },
    { name: 'Stomp', mana_cost: '{1}{R}', type_line: 'Instant — Adventure' },
  ],
})

describe('getCardManaCost', () => {
  it('returns the top-level mana cost of a normal card', () => {
    expect(getCardManaCost(makeCard('Lightning Bolt', { mana_cost: '{R}' }))).toBe('{R}')
  })

  it('falls back to the front face of a transform card', () => {
    expect(getCardManaCost(vincentValentine)).toBe('{2}{B}{B}')
  })

  it('falls back to the front face of a modal DFC', () => {
    expect(getCardManaCost(shatterskullSmashing)).toBe('{X}{R}{R}')
  })

  it('keeps the combined top-level cost of split and adventure cards', () => {
    expect(getCardManaCost(fireIce)).toBe('{1}{R} // {1}{U}')
    expect(getCardManaCost(bonecrusherGiant)).toBe('{2}{R} // {1}{R}')
  })

  it('returns undefined for a card with no mana cost', () => {
    expect(getCardManaCost(makeCard('Forest', { type_line: 'Basic Land — Forest', mana_cost: '' }))).toBeUndefined()
  })

  it('returns undefined when there is no card', () => {
    expect(getCardManaCost(undefined)).toBeUndefined()
  })
})
