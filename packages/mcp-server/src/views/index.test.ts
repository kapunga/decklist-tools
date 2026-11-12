import { describe, it, expect } from 'vitest'
import { renderFullView, renderCurveView, renderNotesView, renderPullListView } from './index.js'
import { makeDeck, makeDeckCard, makeMockCache, mockScryfallCard, pushMainboard, pushSideboard, pushAlternates } from '../__test__/helpers.js'
import type { Deck, RoleDefinition, ScryfallCard, CardFilter, SetCollectionFile } from '@mtg-deckbuilder/shared'
import { enrichCards, applyFilters, getMainboard, getCommanderEntries } from '@mtg-deckbuilder/shared'

const globalRoles: RoleDefinition[] = [
  { id: 'ramp', name: 'Ramp', description: 'Accelerates mana production', color: '#22c55e' },
  { id: 'removal', name: 'Removal', description: 'Removes permanents', color: '#ef4444' },
]

// Test-local shim mirroring the old production `renderDeckView` dispatcher.
// The production dispatcher was deleted when the `view_deck` MCP tool was
// split into per-view tools (`deck_list`/`deck_curve`/`deck_notes`/`deck_pull_list`).
// Kept here so the per-view rendering tests — which predate the split — can
// stay callsite-stable. New view tests should call the render functions directly.
function renderDeckView(
  deck: Deck,
  viewType: string,
  roles: RoleDefinition[],
  sortBy?: string,
  groupBy?: string,
  filters?: CardFilter[],
  scryfallCache?: Map<string, ScryfallCard>,
  detail?: 'summary' | 'compact' | 'full',
  setCollection?: SetCollectionFile,
): string {
  let filteredCardIds: Set<string> | undefined
  if (filters && filters.length > 0) {
    const cache = scryfallCache ?? new Map<string, ScryfallCard>()
    const enriched = enrichCards(getMainboard(deck), cache)
    filteredCardIds = new Set(applyFilters(enriched, filters).map(e => e.deckCard.id))
  }
  switch (viewType) {
    case 'curve':
      return renderCurveView(deck, scryfallCache, filteredCardIds)
    case 'notes':
      return renderNotesView(deck, roles)
    case 'pull-list':
      return renderPullListView(
        deck,
        setCollection ?? { version: 1, updatedAt: '', sets: [] },
        scryfallCache ?? new Map<string, ScryfallCard>(),
        { showPulled: true },
      )
    case 'full':
    default:
      return renderFullView(deck, roles, sortBy, groupBy, filteredCardIds, scryfallCache, detail)
  }
}

function render(viewType: string, deckOverrides?: Parameters<typeof makeDeck>[0], roles = globalRoles, sortBy?: string, groupBy?: string) {
  const deck = makeDeck(deckOverrides)
  return renderDeckView(deck, viewType, roles, sortBy, groupBy)
}

describe('full view', () => {
  it('shows deck name and format', () => {
    const result = render('full', { name: 'Test Deck' })
    expect(result).toContain('# Test Deck')
    expect(result).toContain('commander')
  })

  it('shows commanders section', () => {
    const deck = makeDeck({ name: 'CMD' })
    deck.commanders.push({ name: 'Kenrith', setCode: 'eld', collectorNumber: '303' })
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('## Commander(s)')
    expect(result).toContain('Kenrith')
  })

  it('renders mainboard and alternates as separate sections', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Sol Ring'))
    pushAlternates(deck,makeDeckCard('Mana Crypt'))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('## Main Deck')
    expect(result).toContain('## Alternates')
    expect(result).toContain('Sol Ring')
    expect(result).toContain('Mana Crypt')
  })

  it('shows alternates and sideboard sections', () => {
    const deck = makeDeck()
    pushAlternates(deck,makeDeckCard('Alt Card'))
    pushSideboard(deck,makeDeckCard('Side Card'))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('## Alternates')
    expect(result).toContain('Alt Card')
    expect(result).toContain('## Sideboard')
    expect(result).toContain('Side Card')
  })

  it('shows role names and ownership badges', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Sol Ring', { roles: ['ramp'], ownership: 'need_to_buy' }))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('(Ramp)')
    expect(result).toContain('[NEED TO BUY]')
  })

  it('shows pulled badge when fully pulled via pulledPrintings', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Island', {
      quantity: 1,
      pulledPrintings: [{ setCode: 'lea', collectorNumber: '1', quantity: 1 }]
    }))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('[PULLED]')
  })
})

describe('full view with group_by=role', () => {
  it('groups cards by role with descriptions', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Sol Ring', { roles: ['ramp'] }))
    const result = renderDeckView(deck, 'full', globalRoles, undefined, 'role')
    expect(result).toContain('## Ramp')
    expect(result).toContain('*Accelerates mana production*')
  })

  it('shows unassigned section', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Island', { roles: [] }))
    const result = renderDeckView(deck, 'full', globalRoles, undefined, 'role')
    expect(result).toContain('## Unassigned')
  })

  it('groups alternates by role under their own section', () => {
    const deck = makeDeck()
    pushAlternates(deck,makeDeckCard('Sol Ring', { roles: ['ramp'] }))
    const result = renderDeckView(deck, 'full', globalRoles, undefined, 'role')
    expect(result).toContain('## Alternates\n### Ramp (1)')
    expect(result).toContain('Sol Ring')
  })
})

describe('full view with group_by=type', () => {
  it('groups by card type', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Elf'))
    pushMainboard(deck, makeDeckCard('Bolt'))
    pushMainboard(deck, makeDeckCard('Forest'))
    const cache = makeMockCache({ Elf: 'Creature — Elf', Bolt: 'Instant', Forest: 'Basic Land — Forest' })
    const result = renderDeckView(deck, 'full', globalRoles, undefined, 'type', undefined, cache)
    expect(result).toContain('## Creature')
    expect(result).toContain('## Instant')
    expect(result).toContain('## Land')
  })

  it('sorts types in CARD_TYPE_ORDER', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Land Card'))
    pushMainboard(deck, makeDeckCard('Creature Card'))
    const cache = makeMockCache({ 'Land Card': 'Land', 'Creature Card': 'Creature' })
    const result = renderDeckView(deck, 'full', globalRoles, undefined, 'type', undefined, cache)
    const creatureIdx = result.indexOf('## Creature')
    const landIdx = result.indexOf('## Land')
    expect(creatureIdx).toBeLessThan(landIdx)
  })
})

describe('full view with sort_by=set', () => {
  it('sorts by set and collector number', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Card B', {
      card: { name: 'Card B', setCode: 'aaa', collectorNumber: '10' }
    }))
    pushMainboard(deck,makeDeckCard('Card A', {
      card: { name: 'Card A', setCode: 'aaa', collectorNumber: '2' }
    }))
    const result = renderDeckView(deck, 'full', globalRoles, 'set')
    const cardAIdx = result.indexOf('Card A')
    const cardBIdx = result.indexOf('Card B')
    expect(cardAIdx).toBeLessThan(cardBIdx)
  })

  it('shows pulled and need-to-buy flags', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Owned Card', {
      quantity: 1,
      pulledPrintings: [{ setCode: 'lea', collectorNumber: '1', quantity: 1 }]
    }))
    pushMainboard(deck,makeDeckCard('Need Card', { ownership: 'need_to_buy' }))
    const result = renderDeckView(deck, 'full', globalRoles, 'set')
    expect(result).toMatch(/Owned Card.*\[PULLED\]/)
    expect(result).toMatch(/Need Card.*\[NEED TO BUY\]/)
  })
})

describe('curve view', () => {
  it('shows type distribution', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Creature A'))
    pushMainboard(deck, makeDeckCard('Instant A'))
    const cache = makeMockCache({ 'Creature A': 'Creature — Elf', 'Instant A': 'Instant' })
    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache)
    expect(result).toContain('## Type Distribution')
    expect(result).toContain('Creature')
    expect(result).toContain('Instant')
  })

  it('shows land/nonland counts', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Forest'))
    pushMainboard(deck, makeDeckCard('Sol Ring'))
    const cache = makeMockCache({ Forest: 'Basic Land — Forest', 'Sol Ring': 'Artifact' })
    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache)
    expect(result).toContain('Lands: 1')
    expect(result).toContain('Nonlands:')
  })

  function commanderDeck() {
    const deck = makeDeck()
    deck.commanders.push({ name: 'Kenrith', setCode: 'eld', collectorNumber: '303' })
    pushMainboard(deck, makeDeckCard('Forest', { quantity: 2 }), makeDeckCard('Sol Ring'))
    const cache = makeMockCache({ Forest: 'Basic Land — Forest', 'Sol Ring': 'Artifact' })
    return { deck, cache }
  }

  it('reconciles lands + nonlands + commander with the total', () => {
    const { deck, cache } = commanderDeck()
    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache)
    expect(result).toContain('## Card Counts\n- Lands: 2\n- Nonlands: 1\n- Commander: 1\n- Total: 4/100')
  })

  it('counts only the filtered subset under filters and says so', () => {
    const { deck, cache } = commanderDeck()
    const filters: CardFilter[] = [{ type: 'card-type', mode: 'include', values: ['Land'] }]
    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, filters, cache)
    expect(result).toContain('## Card Counts (filtered)')
    expect(result).toContain('- Lands: 2\n- Nonlands: 0\n- Matching: 2 of 3 mainboard cards')
    expect(result).toContain('Deck total: 4/100')
  })
})

describe('curve view mana pips', () => {
  function pipDeck(manaCosts: Record<string, string>) {
    const deck = makeDeck()
    const cache = new Map<string, ScryfallCard>()
    for (const [name, manaCost] of Object.entries(manaCosts)) {
      const entry = makeDeckCard(name)
      pushMainboard(deck, entry)
      cache.set(entry.card.scryfallId!, mockScryfallCard(name, { id: entry.card.scryfallId!, mana_cost: manaCost, type_line: 'Artifact' }))
    }
    return renderCurveView(deck, cache)
  }

  it('shows generic mana on its own line, not as Colorless', () => {
    const result = pipDeck({ Elf: '{3}{G}' })
    expect(result).toContain('- Green: 1')
    expect(result).toContain('- Generic: 3')
    expect(result).not.toContain('Colorless')
  })

  it('counts real {C} pips as Colorless', () => {
    expect(pipDeck({ Eldrazi: '{C}{C}' })).toContain('- Colorless: 2')
  })

  it('does not print a Colorless count for a generic-only deck', () => {
    const result = pipDeck({ 'Sol Ring': '{1}', Signet: '{2}' })
    expect(result).not.toContain('Colorless')
    expect(result).toContain('- Generic: 3')
  })

  it('shows mana curve with scryfall data', () => {
    const deck = makeDeck()
    const card1 = makeDeckCard('Sol Ring')
    const card2 = makeDeckCard('Creature X', { quantity: 3 })
    pushMainboard(deck,card1, card2)

    const cache = new Map<string, import('@mtg-deckbuilder/shared').ScryfallCard>()
    cache.set(card1.card.scryfallId!, {
      id: card1.card.scryfallId!, name: 'Sol Ring', cmc: 1, type_line: 'Artifact',
      color_identity: [], set: 'test', collector_number: '1', rarity: 'uncommon',
      mana_cost: '{1}', legalities: {},
    })
    cache.set(card2.card.scryfallId!, {
      id: card2.card.scryfallId!, name: 'Creature X', cmc: 3, type_line: 'Creature — Human',
      color_identity: ['R'], colors: ['R'], set: 'test', collector_number: '2', rarity: 'common',
      mana_cost: '{2}{R}', legalities: {},
    })

    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache)
    expect(result).toContain('## Mana Curve')
    expect(result).toContain('1    █ 1')
    expect(result).toContain('3    ███ 3')
  })

  it('shows mana pip distribution', () => {
    const deck = makeDeck()
    const card = makeDeckCard('Lightning Bolt', { quantity: 2 })
    pushMainboard(deck,card)

    const cache = new Map<string, import('@mtg-deckbuilder/shared').ScryfallCard>()
    cache.set(card.card.scryfallId!, {
      id: card.card.scryfallId!, name: 'Lightning Bolt', cmc: 1, type_line: 'Instant',
      color_identity: ['R'], colors: ['R'], set: 'test', collector_number: '1', rarity: 'common',
      mana_cost: '{R}', legalities: {},
    })

    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache)
    expect(result).toContain('## Mana Pips')
    expect(result).toContain('Red: 2')
  })

  it('applies filters to curve view', () => {
    const deck = makeDeck()
    const creature = makeDeckCard('Elf')
    const instant = makeDeckCard('Bolt')
    pushMainboard(deck,creature, instant)

    const cache = new Map<string, import('@mtg-deckbuilder/shared').ScryfallCard>()
    cache.set(creature.card.scryfallId!, {
      id: creature.card.scryfallId!, name: 'Elf', cmc: 1, type_line: 'Creature — Elf',
      color_identity: ['G'], colors: ['G'], set: 'test', collector_number: '1', rarity: 'common',
      mana_cost: '{G}', legalities: {},
    })
    cache.set(instant.card.scryfallId!, {
      id: instant.card.scryfallId!, name: 'Bolt', cmc: 1, type_line: 'Instant',
      color_identity: ['R'], colors: ['R'], set: 'test', collector_number: '2', rarity: 'common',
      mana_cost: '{R}', legalities: {},
    })

    const filters = [{ type: 'card-type' as const, mode: 'include' as const, values: ['Creature'] }]
    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, filters, cache)
    expect(result).toContain('Creature')
    const typeDistSection = result.split('## Type Distribution')[1]?.split('##')[0] || ''
    expect(typeDistSection).not.toContain('Instant')
  })
})

describe('card classification is consistent across views', () => {
  function typeDistribution(curve: string): string {
    return curve.split('## Type Distribution')[1]?.split('##')[0] || ''
  }

  function render(deck: Deck, cache: Map<string, ScryfallCard>) {
    return {
      list: renderDeckView(deck, 'full', globalRoles, undefined, 'type', undefined, cache),
      curve: renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache),
    }
  }

  it('uses the stored primaryType when the card is not in the Scryfall cache', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Adewale', { primaryType: 'Creature' }))
    pushMainboard(deck, makeDeckCard('Rakish Crew', { primaryType: 'Enchantment' }))
    const { list, curve } = render(deck, new Map())
    expect(list).toContain('## Creature (1)')
    expect(list).toContain('## Enchantment (1)')
    expect(list).not.toContain('## Other')
    expect(typeDistribution(curve)).toMatch(/Creature\s+█ 1/)
    expect(typeDistribution(curve)).toMatch(/Enchantment\s+█ 1/)
  })

  it('classifies a land-front transform card as Land everywhere (Balamb Garden)', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Balamb Garden'))
    const cache = makeMockCache({ 'Balamb Garden': 'Land — Town // Legendary Artifact — Vehicle' })
    const { list, curve } = render(deck, cache)
    expect(list).toContain('## Land (1)')
    expect(list).not.toContain('## Artifact')
    expect(typeDistribution(curve)).toMatch(/Land\s+█ 1/)
    expect(curve).toContain('Lands: 1')
  })

  it('does not count an artifact-front transform card as a land (Treasure Map)', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Treasure Map'))
    const cache = makeMockCache({ 'Treasure Map': 'Artifact // Land' })
    const { list, curve } = render(deck, cache)
    expect(list).toContain('## Artifact (1)')
    expect(typeDistribution(curve)).toMatch(/Artifact\s+█ 1/)
    expect(curve).toContain('Lands: 0')
  })

  it('does not count a noncreature-front card as a creature (Esper Origins)', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Esper Origins'))
    const cache = makeMockCache({ 'Esper Origins': 'Sorcery // Enchantment Creature — Saga Human' })
    const { list, curve } = render(deck, cache)
    expect(list).toContain('## Sorcery (1)')
    expect(list).not.toContain('## Creature')
    expect(typeDistribution(curve)).not.toContain('Creature')
  })

  it('keeps the Lands count equal to the Land row of the type distribution (Dryad Arbor)', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Dryad Arbor'))
    pushMainboard(deck, makeDeckCard('Forest'))
    const cache = makeMockCache({ 'Dryad Arbor': 'Land Creature — Forest Dryad', Forest: 'Basic Land — Forest' })
    const { curve } = render(deck, cache)
    expect(typeDistribution(curve)).toMatch(/Land\s+█ 1/)
    expect(curve).toContain('Lands: 1')
  })
})

describe('notes view', () => {
  it('shows note type badges', () => {
    const deck = makeDeck()
    deck.notes.push({
      id: 'n1', title: 'My Combo', content: 'A + B = win', noteType: 'combo',
      cardRefs: [{ cardName: 'Sol Ring', ordinal: 1 }], createdAt: '', updatedAt: '',
    })
    const result = renderDeckView(deck, 'notes', globalRoles)
    expect(result).toContain('[COMBO]')
    expect(result).toContain('My Combo')
    expect(result).toContain('A + B = win')
  })

  it('shows card refs with ordinals', () => {
    const deck = makeDeck()
    deck.notes.push({
      id: 'n1', title: 'T', content: 'C', noteType: 'general',
      cardRefs: [
        { cardName: 'Sol Ring', ordinal: 1 },
        { cardName: 'Mana Crypt', ordinal: 2 },
      ],
      createdAt: '', updatedAt: '',
    })
    const result = renderDeckView(deck, 'notes', globalRoles)
    expect(result).toContain('1. Sol Ring')
    expect(result).toContain('2. Mana Crypt')
  })

  it('shows role name on note', () => {
    const deck = makeDeck()
    deck.notes.push({
      id: 'n1', title: 'T', content: 'C', noteType: 'strategy',
      cardRefs: [], roleId: 'ramp', createdAt: '', updatedAt: '',
    })
    const result = renderDeckView(deck, 'notes', globalRoles)
    expect(result).toContain('**Role:** Ramp')
  })

  it('shows empty message', () => {
    const result = render('notes')
    expect(result).toContain('No notes yet')
  })
})

describe('default/unknown view', () => {
  it('falls back to full view', () => {
    const result = render('nonexistent-view', { name: 'Fallback Test' })
    expect(result).toContain('# Fallback Test')
  })
})

describe('pull list view', () => {
  it("includes a printing whose rarity exceeds its set's tracked collection level, flagged rather than dropped", () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Mystic Confluence', {
      quantity: 1,
      card: { scryfallId: 'scryfall-mystic-confluence', name: 'Mystic Confluence', setCode: 'grn', collectorNumber: '46' },
    }))

    const scryfallCache = new Map<string, ScryfallCard>()
    scryfallCache.set('scryfall-mystic-confluence', mockScryfallCard('Mystic Confluence', {
      id: 'scryfall-mystic-confluence',
      set: 'grn',
      collector_number: '46',
      rarity: 'rare',
    }))

    const setCollection: SetCollectionFile = {
      version: 1, updatedAt: '',
      sets: [{ setCode: 'grn', setName: 'Guilds of Ravnica', collectionLevel: 1, addedAt: '' }],
    }

    const result = renderPullListView(deck, setCollection, scryfallCache, { showPulled: true })

    // Previously: a level-1 tracked set silently dropped rare/mythic printings
    // (the card fell through to "Not in collection" instead of appearing here).
    expect(result).toContain('Guilds of Ravnica')
    expect(result).not.toContain('Not in collection')
    expect(result).toContain('Mystic Confluence')
    expect(result).toContain('R*')
    expect(result).toContain('tracked collection level')
  })

  it("does not flag a printing whose rarity is within its set's tracked collection level", () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Opt', {
      quantity: 1,
      card: { scryfallId: 'scryfall-opt', name: 'Opt', setCode: 'grn', collectorNumber: '10' },
    }))

    const scryfallCache = new Map<string, ScryfallCard>()
    scryfallCache.set('scryfall-opt', mockScryfallCard('Opt', {
      id: 'scryfall-opt',
      set: 'grn',
      collector_number: '10',
      rarity: 'common',
    }))

    const setCollection: SetCollectionFile = {
      version: 1, updatedAt: '',
      sets: [{ setCode: 'grn', setName: 'Guilds of Ravnica', collectionLevel: 1, addedAt: '' }],
    }

    const result = renderPullListView(deck, setCollection, scryfallCache, { showPulled: true })

    expect(result).toContain('Opt')
    expect(result).not.toContain('C*')
    expect(result).not.toContain('tracked collection level')
  })

  it('shows the card type rather than the first supertype', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Jackdaw', {
      card: { scryfallId: 'scryfall-jackdaw', name: 'Jackdaw', setCode: 'acr', collectorNumber: '1' },
    }))
    const scryfallCache = new Map<string, ScryfallCard>()
    scryfallCache.set('scryfall-jackdaw', mockScryfallCard('Jackdaw', {
      id: 'scryfall-jackdaw', set: 'acr', collector_number: '1', type_line: 'Legendary Artifact — Vehicle',
    }))

    const result = renderPullListView(deck, { version: 1, updatedAt: '', sets: [] }, scryfallCache, { showPulled: true })

    expect(result).toContain('| Artifact |')
    expect(result).not.toContain('Legendary')
  })
})

describe('double-faced card mana costs', () => {
  // Modelled on Scryfall JSON: transform and modal_dfc layouts have no
  // top-level `mana_cost`; the cost lives on the front face.
  function vincentValentine(): ScryfallCard {
    return mockScryfallCard('Vincent Valentine', {
      id: 'scryfall-vincent-valentine',
      name: 'Vincent Valentine // Galian Beast',
      layout: 'transform',
      cmc: 4,
      mana_cost: undefined,
      type_line: 'Legendary Creature — Human Assassin // Legendary Creature — Werewolf Beast',
      colors: undefined,
      color_identity: ['B'],
      card_faces: [
        { name: 'Vincent Valentine', mana_cost: '{2}{B}{B}', type_line: 'Legendary Creature — Human Assassin', colors: ['B'] },
        { name: 'Galian Beast', mana_cost: '', type_line: 'Legendary Creature — Werewolf Beast', colors: ['B'] },
      ],
    })
  }

  function shatterskullSmashing(): ScryfallCard {
    return mockScryfallCard('Shatterskull Smashing', {
      id: 'scryfall-shatterskull-smashing',
      name: 'Shatterskull Smashing // Shatterskull, the Hammer Pass',
      layout: 'modal_dfc',
      cmc: 2,
      mana_cost: undefined,
      type_line: 'Sorcery // Land',
      colors: undefined,
      color_identity: ['R'],
      card_faces: [
        { name: 'Shatterskull Smashing', mana_cost: '{X}{R}{R}', type_line: 'Sorcery', colors: ['R'] },
        { name: 'Shatterskull, the Hammer Pass', mana_cost: '', type_line: 'Land', colors: [] },
      ],
    })
  }

  function dfcDeck(): { deck: Deck; cache: Map<string, ScryfallCard> } {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Vincent Valentine'))
    pushMainboard(deck, makeDeckCard('Shatterskull Smashing'))
    const cache = new Map([vincentValentine(), shatterskullSmashing()].map(c => [c.id, c]))
    return { deck, cache }
  }

  it.each(['summary', 'compact', 'full'] as const)('deck_list %s shows the front-face mana cost', (detail) => {
    const { deck, cache } = dfcDeck()
    const result = renderDeckView(deck, 'full', globalRoles, undefined, undefined, undefined, cache, detail)
    expect(result).toMatch(/Vincent Valentine.*\{2\}\{B\}\{B\}/)
    expect(result).toMatch(/Shatterskull Smashing.*\{X\}\{R\}\{R\}/)
  })

  it('deck_curve counts front-face pips of double-faced cards', () => {
    const { deck, cache } = dfcDeck()
    const result = renderDeckView(deck, 'curve', globalRoles, undefined, undefined, undefined, cache)
    expect(result).toContain('Black: 2')
    expect(result).toContain('Red: 2')
  })

  it('deck_pull_list shows the front-face mana cost', () => {
    const { deck, cache } = dfcDeck()
    const result = renderPullListView(deck, { version: 1, updatedAt: '', sets: [] }, cache, { showPulled: true })
    expect(result).toContain('{2}{B}{B}')
    expect(result).toContain('{X}{R}{R}')
  })
})

describe('missing Scryfall data warning', () => {
  it('names at most 25 cards and counts the rest', () => {
    const deck = makeDeck()
    const entries = Array.from({ length: 27 }, (_, i) => makeDeckCard(`Card ${i}`, { primaryType: 'Creature' }))
    pushMainboard(deck, ...entries)
    const result = renderCurveView(deck, new Map(), undefined, entries)
    expect(result).toContain('27 cards without Scryfall data')
    expect(result).toContain('Card 24, and 2 more.')
    expect(result).not.toContain('Card 25,')
  })

  it('deck_curve footnote counts only the nonland cards among those the warning counts', () => {
    const deck = makeDeck()
    const bolts = makeDeckCard('Lightning Bolt', { primaryType: 'Instant', quantity: 3 })
    const forests = makeDeckCard('Forest', { primaryType: 'Land', quantity: 2 })
    pushMainboard(deck, bolts, forests)
    const result = renderCurveView(deck, new Map(), undefined, [bolts, forests])
    expect(result).toContain('5 cards without Scryfall data')
    expect(result).toContain('_Of the cards without Scryfall data, 3 are nonland cards and are excluded from the curve and pips._')
  })

  it('deck_curve footnote uses the singular for one nonland card', () => {
    const deck = makeDeck()
    const bolt = makeDeckCard('Lightning Bolt', { primaryType: 'Instant' })
    pushMainboard(deck, bolt)
    const result = renderCurveView(deck, new Map(), undefined, [bolt])
    expect(result).toContain('_Of the cards without Scryfall data, 1 is a nonland card and is excluded from the curve and pips._')
  })

  it('only warns about unresolved cards the view renders', () => {
    const deck = makeDeck()
    const sideboardOnly = makeDeckCard('Sideboard Card')
    pushMainboard(deck, makeDeckCard('Sol Ring'))
    pushSideboard(deck, sideboardOnly)
    const cache = makeMockCache({ 'Sol Ring': 'Artifact' })
    expect(renderCurveView(deck, cache, undefined, [sideboardOnly])).not.toContain('Warning')
    expect(renderFullView(deck, globalRoles, undefined, undefined, undefined, cache, 'compact', [sideboardOnly]))
      .toContain('Warning')
  })
})

// --- deck_list: one card-line formatter for every grouping (#304, #244, #308) ---

const listModes: [string, string | undefined, string | undefined][] = [
  ['flat', undefined, undefined],
  ['group_by type', undefined, 'type'],
  ['group_by role', undefined, 'role'],
  ['sort_by set', 'set', undefined],
]

describe('deck_list grouped output uses the full card-line formatter', () => {
  function sectionCache(): Map<string, ScryfallCard> {
    const bolt = mockScryfallCard('Lightning Bolt', {
      cmc: 1, mana_cost: '{R}', type_line: 'Instant', oracle_text: 'Deal 3 damage to any target.',
    })
    const elf = mockScryfallCard('Llanowar Elves', {
      cmc: 1, mana_cost: '{G}', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.',
      power: '1', toughness: '1',
    })
    const ring = mockScryfallCard('Sol Ring', { cmc: 1, mana_cost: '{1}', type_line: 'Artifact', oracle_text: '{T}: Add {C}{C}.' })
    const side = mockScryfallCard('Pyroblast', { cmc: 1, mana_cost: '{R}', type_line: 'Instant', oracle_text: 'Counter target spell if it is blue.' })
    return new Map([bolt, elf, ring, side].map(c => [c.id, c]))
  }

  function sectionedDeck(): Deck {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Lightning Bolt', { quantity: 4, roles: ['removal'] }))
    pushMainboard(deck, makeDeckCard('Llanowar Elves', { roles: ['ramp'] }))
    pushAlternates(deck, makeDeckCard('Sol Ring', { roles: ['ramp'] }))
    pushSideboard(deck, makeDeckCard('Pyroblast'))
    return deck
  }

  it.each(listModes)('%s at compact shows mana cost, type line and oracle text', (_label, sortBy, groupBy) => {
    const result = renderFullView(sectionedDeck(), globalRoles, sortBy, groupBy, undefined, sectionCache(), 'compact')
    expect(result).toContain('- 4x Lightning Bolt • {R} Instant')
    expect(result).toContain('  Deal 3 damage to any target.')
    expect(result).toContain('- 1x Llanowar Elves • {G} Creature — Elf Druid 1/1')
  })

  it.each(listModes)('%s at full shows set and rarity', (_label, sortBy, groupBy) => {
    const result = renderFullView(sectionedDeck(), globalRoles, sortBy, groupBy, undefined, sectionCache(), 'full')
    expect(result).toContain('- 4x Lightning Bolt • TEST#1 • rare • {R} Instant')
    expect(result).toContain('  Deal 3 damage to any target.')
  })

  it.each(listModes)('%s at summary omits oracle text', (_label, sortBy, groupBy) => {
    const result = renderFullView(sectionedDeck(), globalRoles, sortBy, groupBy, undefined, sectionCache(), 'summary')
    expect(result).toContain('- 4x Lightning Bolt • {R} [Instant]')
    expect(result).not.toContain('Deal 3 damage')
  })

  it.each(listModes)('%s includes the Alternates and Sideboard sections', (_label, sortBy, groupBy) => {
    const result = renderFullView(sectionedDeck(), globalRoles, sortBy, groupBy, undefined, sectionCache(), 'compact')
    expect(result).toContain('## Main Deck')
    expect(result).toContain('## Alternates')
    expect(result).toContain('- 1x Sol Ring • {1} Artifact')
    expect(result).toContain('## Sideboard')
    expect(result).toContain('  Counter target spell if it is blue.')
    expect(result.indexOf('## Main Deck')).toBeLessThan(result.indexOf('## Alternates'))
    expect(result.indexOf('## Alternates')).toBeLessThan(result.indexOf('## Sideboard'))
  })

  it.each(listModes)('%s shows role names on each line', (_label, sortBy, groupBy) => {
    const result = renderFullView(sectionedDeck(), globalRoles, sortBy, groupBy, undefined, sectionCache(), 'summary')
    expect(result).toMatch(/4x Lightning Bolt.*\(Removal\)/)
  })

  it('group_by type nests counted type headings under each section', () => {
    const result = renderFullView(sectionedDeck(), globalRoles, undefined, 'type', undefined, sectionCache(), 'compact')
    expect(result).toContain('## Main Deck\n### Creature (1)')
    expect(result).toContain('### Instant (4)')
    expect(result).toContain('## Alternates\n### Artifact (1)')
    expect(result).toContain('## Sideboard\n### Instant (1)')
  })

  it('group_by role nests counted role headings under each section', () => {
    const result = renderFullView(sectionedDeck(), globalRoles, undefined, 'role', undefined, sectionCache(), 'compact')
    expect(result).toContain('### Ramp (1)\n*Accelerates mana production*')
    expect(result).toContain('### Removal (4)')
    expect(result).toContain('## Sideboard\n### Unassigned (1)')
  })

  it('group_by type agrees with the entry primary type for double-faced cards', () => {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Shatterskull Smashing'))
    const mdfc = mockScryfallCard('Shatterskull Smashing', {
      type_line: 'Sorcery // Land', mana_cost: undefined,
      card_faces: [
        { name: 'Shatterskull Smashing', mana_cost: '{X}{R}{R}', type_line: 'Sorcery', colors: ['R'] },
        { name: 'Shatterskull, the Hammer Pass', mana_cost: '', type_line: 'Land', colors: [] },
      ],
    })
    const result = renderFullView(deck, globalRoles, undefined, 'type', undefined, new Map([[mdfc.id, mdfc]]), 'compact')
    expect(result).toContain('### Sorcery (1)')
    expect(result).not.toContain('### Land')
  })
})

describe('deck_list flags on a card in both mainboard and alternates (#308)', () => {
  function duplicatedDeck(mainOwnership: 'owned' | 'need_to_buy', altOwnership: 'owned' | 'need_to_buy'): Deck {
    const deck = makeDeck()
    pushMainboard(deck, makeDeckCard('Sol Ring', { roles: ['ramp'], ownership: mainOwnership }))
    pushAlternates(deck, makeDeckCard('Sol Ring', { roles: ['ramp'], ownership: altOwnership }))
    return deck
  }

  const cache = makeMockCache({ 'Sol Ring': 'Artifact' })
  const solRingLines = (text: string) => text.split('\n').filter(l => l.includes('Sol Ring'))

  it.each(listModes)('%s flags every copy that needs buying', (_label, sortBy, groupBy) => {
    const result = renderFullView(duplicatedDeck('need_to_buy', 'need_to_buy'), globalRoles, sortBy, groupBy, undefined, cache, 'compact')
    const lines = solRingLines(result)
    expect(lines).toHaveLength(2)
    expect(lines.every(l => l.includes('[NEED TO BUY]'))).toBe(true)
  })

  it.each(listModes)('%s flags each copy from its own entry', (_label, sortBy, groupBy) => {
    const result = renderFullView(duplicatedDeck('owned', 'need_to_buy'), globalRoles, sortBy, groupBy, undefined, cache, 'compact')
    const mainPart = result.slice(result.indexOf('## Main Deck'), result.indexOf('## Alternates'))
    const altPart = result.slice(result.indexOf('## Alternates'))
    expect(solRingLines(mainPart)).toHaveLength(1)
    expect(solRingLines(mainPart)[0]).not.toContain('[NEED TO BUY]')
    expect(solRingLines(altPart)).toHaveLength(1)
    expect(solRingLines(altPart)[0]).toContain('[NEED TO BUY]')
  })
})

describe('deck_list commander section (#244)', () => {
  const kenrith = mockScryfallCard('Kenrith, the Returned King', {
    mana_cost: '{4}{W}', type_line: 'Legendary Creature — Human Noble', power: '5', toughness: '5',
    oracle_text: '{R}: All creatures gain trample and haste until end of turn.',
  })
  const tymna = mockScryfallCard('Tymna the Weaver', {
    mana_cost: '{1}{W}{B}', type_line: 'Legendary Creature — Human Cleric', power: '2', toughness: '2',
    oracle_text: 'Lifelink. Partner',
  })

  function commanderDeck(...cards: ScryfallCard[]): { deck: Deck; cache: Map<string, ScryfallCard> } {
    const deck = makeDeck()
    deck.commanders.push(...cards.map(c => ({ scryfallId: c.id, name: c.name, setCode: 'test', collectorNumber: '1' })))
    return { deck, cache: new Map(cards.map(c => [c.id, c])) }
  }

  it.each([undefined, 'type', 'role'])('shows mana cost, type line and oracle text at compact (group_by %s)', (groupBy) => {
    const { deck, cache } = commanderDeck(kenrith)
    const result = renderFullView(deck, globalRoles, undefined, groupBy, undefined, cache, 'compact')
    expect(result).toContain('## Commander(s)\n- 1x Kenrith, the Returned King • {4}{W} Legendary Creature — Human Noble 5/5')
    expect(result).toContain('  {R}: All creatures gain trample and haste until end of turn.')
  })

  it('shows set and rarity at full', () => {
    const { deck, cache } = commanderDeck(kenrith)
    const result = renderFullView(deck, globalRoles, undefined, undefined, undefined, cache, 'full')
    expect(result).toContain('- 1x Kenrith, the Returned King • TEST#1 • rare • {4}{W}')
    expect(result).toContain('trample and haste')
  })

  it('omits oracle text at summary', () => {
    const { deck, cache } = commanderDeck(kenrith)
    const result = renderFullView(deck, globalRoles, undefined, undefined, undefined, cache, 'summary')
    expect(result).toContain('- 1x Kenrith, the Returned King • {4}{W}')
    expect(result).not.toContain('trample and haste')
  })

  it('renders partner commanders', () => {
    const { deck, cache } = commanderDeck(kenrith, tymna)
    const result = renderFullView(deck, globalRoles, undefined, undefined, undefined, cache, 'compact')
    expect(result).toContain('{1}{W}{B} Legendary Creature — Human Cleric 2/2')
    expect(result).toContain('  Lifelink. Partner')
  })

  it('shows the front-face cost of a double-faced commander', () => {
    const esika = mockScryfallCard('Esika, God of the Tree', {
      layout: 'modal_dfc', mana_cost: undefined, type_line: 'Legendary Creature — God // Legendary Artifact',
      card_faces: [
        { name: 'Esika, God of the Tree', mana_cost: '{1}{G}{G}', type_line: 'Legendary Creature — God', colors: ['G'] },
        { name: 'The Prismatic Bridge', mana_cost: '{W}{U}{B}{R}{G}', type_line: 'Legendary Artifact', colors: [] },
      ],
    })
    const { deck, cache } = commanderDeck(esika)
    const result = renderFullView(deck, globalRoles, undefined, undefined, undefined, cache, 'compact')
    expect(result).toMatch(/Esika, God of the Tree • \{1\}\{G\}\{G\}/)
  })

  it('warns about and marks an unresolved commander', () => {
    const { deck } = commanderDeck(kenrith)
    const result = renderFullView(deck, globalRoles, undefined, undefined, undefined, new Map(), 'compact', getCommanderEntries(deck))
    expect(result).toContain('Warning')
    expect(result).toMatch(/1x Kenrith, the Returned King.*\[no Scryfall data\]/)
  })
})
