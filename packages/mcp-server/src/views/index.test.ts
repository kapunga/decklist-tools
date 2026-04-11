import { describe, it, expect } from 'vitest'
import { renderFullView, renderCurveView, renderNotesView, renderPullListView } from './index.js'
import { makeDeck, makeDeckCard, makeMockCache, pushMainboard, pushSideboard, pushAlternates } from '../__test__/helpers.js'
import type { Deck, RoleDefinition, ScryfallCard, CardFilter, SetCollectionFile } from '@mtg-deckbuilder/shared'
import { enrichCards, applyFilters, getMainboard } from '@mtg-deckbuilder/shared'

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

  it('does not include alternates when grouping by role', () => {
    const deck = makeDeck()
    pushAlternates(deck,makeDeckCard('Sol Ring', { roles: ['ramp'] }))
    const result = renderDeckView(deck, 'full', globalRoles, undefined, 'role')
    expect(result).not.toContain('Sol Ring')
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

  it('shows checkbox status', () => {
    const deck = makeDeck()
    pushMainboard(deck,makeDeckCard('Owned Card', {
      quantity: 1,
      pulledPrintings: [{ setCode: 'lea', collectorNumber: '1', quantity: 1 }]
    }))
    pushMainboard(deck,makeDeckCard('Need Card', { ownership: 'need_to_buy' }))
    const result = renderDeckView(deck, 'full', globalRoles, 'set')
    expect(result).toContain('[x]')
    expect(result).toContain('[ ]')
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
