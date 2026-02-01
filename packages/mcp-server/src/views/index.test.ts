import { describe, it, expect } from 'vitest'
import { renderDeckView, getViewDescriptions } from './index.js'
import { makeDeck, makeDeckCard } from '../__test__/helpers.js'
import type { RoleDefinition } from '@mtg-deckbuilder/shared'

const globalRoles: RoleDefinition[] = [
  { id: 'ramp', name: 'Ramp', description: 'Accelerates mana production', color: '#22c55e' },
  { id: 'removal', name: 'Removal', description: 'Removes permanents', color: '#ef4444' },
]

function render(viewType: string, deckOverrides?: Parameters<typeof makeDeck>[0], roles = globalRoles) {
  const deck = makeDeck(deckOverrides)
  return renderDeckView(deck, viewType, roles)
}

describe('getViewDescriptions', () => {
  it('returns 8 views', () => {
    const views = getViewDescriptions()
    expect(views).toHaveLength(8)
    expect(views.map(v => v.id)).toEqual([
      'full', 'skeleton', 'checklist', 'curve', 'buy-list', 'by-role', 'by-type', 'notes'
    ])
  })
})

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

  it('separates confirmed and considering cards', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Sol Ring', { inclusion: 'confirmed' }))
    deck.cards.push(makeDeckCard('Mana Crypt', { inclusion: 'considering' }))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('### Confirmed')
    expect(result).toContain('### Considering')
    expect(result).toContain('Sol Ring')
    expect(result).toContain('Mana Crypt')
  })

  it('shows alternates and sideboard sections', () => {
    const deck = makeDeck()
    deck.alternates.push(makeDeckCard('Alt Card'))
    deck.sideboard.push(makeDeckCard('Side Card'))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('## Alternates')
    expect(result).toContain('Alt Card')
    expect(result).toContain('## Sideboard')
    expect(result).toContain('Side Card')
  })

  it('shows role names and ownership badges', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'], ownership: 'need_to_buy', isPinned: true }))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('(Ramp)')
    expect(result).toContain('[NEED TO BUY]')
    expect(result).toContain('[PINNED]')
  })

  it('shows pulled badge', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Island', { ownership: 'pulled' }))
    const result = renderDeckView(deck, 'full', globalRoles)
    expect(result).toContain('[PULLED]')
  })
})

describe('skeleton view', () => {
  it('groups by role', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
    deck.cards.push(makeDeckCard('Swords to Plowshares', { roles: ['removal'] }))
    const result = renderDeckView(deck, 'skeleton', globalRoles)
    expect(result).toContain('**Ramp**')
    expect(result).toContain('**Removal**')
  })

  it('shows untagged section', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Island', { roles: [] }))
    const result = renderDeckView(deck, 'skeleton', globalRoles)
    expect(result).toContain('**Untagged**')
  })

  it('only includes confirmed cards', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Sol Ring', { inclusion: 'considering', roles: ['ramp'] }))
    const result = renderDeckView(deck, 'skeleton', globalRoles)
    expect(result).not.toContain('Sol Ring')
  })
})

describe('checklist view', () => {
  it('sorts by set and collector number', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Card B', {
      card: { name: 'Card B', setCode: 'aaa', collectorNumber: '10' }
    }))
    deck.cards.push(makeDeckCard('Card A', {
      card: { name: 'Card A', setCode: 'aaa', collectorNumber: '2' }
    }))
    const result = renderDeckView(deck, 'checklist', globalRoles)
    const cardAIdx = result.indexOf('Card A')
    const cardBIdx = result.indexOf('Card B')
    expect(cardAIdx).toBeLessThan(cardBIdx)
  })

  it('shows checkbox status', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Owned Card', { ownership: 'pulled' }))
    deck.cards.push(makeDeckCard('Need Card', { ownership: 'need_to_buy' }))
    const result = renderDeckView(deck, 'checklist', globalRoles)
    expect(result).toContain('[x]')
    expect(result).toContain('[ ]')
  })
})

describe('curve view', () => {
  it('shows type distribution', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Creature A', { typeLine: 'Creature — Elf' }))
    deck.cards.push(makeDeckCard('Instant A', { typeLine: 'Instant' }))
    const result = renderDeckView(deck, 'curve', globalRoles)
    expect(result).toContain('## Type Distribution')
    expect(result).toContain('Creature')
    expect(result).toContain('Instant')
  })

  it('shows land/nonland counts', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Forest', { typeLine: 'Basic Land — Forest' }))
    deck.cards.push(makeDeckCard('Sol Ring', { typeLine: 'Artifact' }))
    const result = renderDeckView(deck, 'curve', globalRoles)
    expect(result).toContain('Lands: 1')
    expect(result).toContain('Nonlands:')
  })

  it('shows mana curve with scryfall data', () => {
    const deck = makeDeck()
    const card1 = makeDeckCard('Sol Ring', { typeLine: 'Artifact' })
    const card2 = makeDeckCard('Creature X', { typeLine: 'Creature — Human', quantity: 3 })
    deck.cards.push(card1, card2)

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
    const card = makeDeckCard('Lightning Bolt', { typeLine: 'Instant', quantity: 2 })
    deck.cards.push(card)

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
    const creature = makeDeckCard('Elf', { typeLine: 'Creature — Elf' })
    const instant = makeDeckCard('Bolt', { typeLine: 'Instant' })
    deck.cards.push(creature, instant)

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
    // Should show only creature in type distribution
    expect(result).toContain('Creature')
    // Instant should not appear in type distribution (it's filtered out)
    const typeDistSection = result.split('## Type Distribution')[1]?.split('##')[0] || ''
    expect(typeDistSection).not.toContain('Instant')
  })
})

describe('buy-list view', () => {
  it('shows only need_to_buy cards', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Buy Me', { ownership: 'need_to_buy' }))
    deck.cards.push(makeDeckCard('Owned', { ownership: 'owned' }))
    const result = renderDeckView(deck, 'buy-list', globalRoles)
    expect(result).toContain('Buy Me')
    expect(result).not.toContain('Owned')
  })

  it('shows empty message when nothing to buy', () => {
    const result = render('buy-list')
    expect(result).toContain('No cards marked as "need to buy"')
  })

  it('includes sideboard cards', () => {
    const deck = makeDeck()
    deck.sideboard.push(makeDeckCard('Side Buy', { ownership: 'need_to_buy' }))
    const result = renderDeckView(deck, 'buy-list', globalRoles)
    expect(result).toContain('Side Buy')
  })
})

describe('by-role view', () => {
  it('groups cards by role with descriptions', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Sol Ring', { roles: ['ramp'] }))
    const result = renderDeckView(deck, 'by-role', globalRoles)
    expect(result).toContain('## Ramp')
    expect(result).toContain('*Accelerates mana production*')
  })

  it('shows unassigned section', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Island', { roles: [] }))
    const result = renderDeckView(deck, 'by-role', globalRoles)
    expect(result).toContain('## Unassigned')
  })
})

describe('by-type view', () => {
  it('groups by card type', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Elf', { typeLine: 'Creature — Elf' }))
    deck.cards.push(makeDeckCard('Bolt', { typeLine: 'Instant' }))
    deck.cards.push(makeDeckCard('Forest', { typeLine: 'Basic Land — Forest' }))
    const result = renderDeckView(deck, 'by-type', globalRoles)
    expect(result).toContain('## Creature')
    expect(result).toContain('## Instant')
    expect(result).toContain('## Land')
  })

  it('sorts types in CARD_TYPE_ORDER', () => {
    const deck = makeDeck()
    deck.cards.push(makeDeckCard('Land Card', { typeLine: 'Land' }))
    deck.cards.push(makeDeckCard('Creature Card', { typeLine: 'Creature' }))
    const result = renderDeckView(deck, 'by-type', globalRoles)
    const creatureIdx = result.indexOf('## Creature')
    const landIdx = result.indexOf('## Land')
    expect(creatureIdx).toBeLessThan(landIdx)
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
