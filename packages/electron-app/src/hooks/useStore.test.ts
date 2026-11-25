import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildBuyList, useStore } from './useStore'
import { FORMAT_TYPE, formatDefaults } from '@mtg-deckbuilder/shared'
import type { Deck, CardEntry, CardSet, CardList } from '@/types'

function entry(name: string, quantity: number, ownership: CardEntry['ownership']): CardEntry {
  return {
    id: name,
    card: { name, scryfallId: 'sf-1', setCode: 'abc', collectorNumber: '1' },
    addedAt: '2026-01-01T00:00:00.000Z',
    source: 'user',
    quantity,
    ownership,
    roles: []
  }
}

function deck(id: string, name: string, cardSets: CardSet[]): Deck {
  return {
    id,
    name,
    format: formatDefaults[FORMAT_TYPE.COMMANDER],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    cardSets,
    commanders: [],
    customRoles: [],
    notes: []
  }
}

describe('buildBuyList', () => {
  it('includes need-to-buy cards from the alternates set, not just mainboard', () => {
    const decks = [
      deck('d1', 'Draw Two', [
        { name: 'mainboard', entries: [] },
        { name: 'alternates', entries: [entry('Consider', 4, 'need_to_buy')] }
      ])
    ]

    const buyList = buildBuyList(decks)

    expect(buyList.map(i => i.cardName)).toContain('Consider')
  })

  it('excludes cards in the cut set', () => {
    const decks = [
      deck('d1', 'Niv-Mizzet, Spellslinger', [
        { name: 'mainboard', entries: [] },
        { name: 'cut', entries: [entry('Harmonic Prodigy', 1, 'need_to_buy')] }
      ])
    ]

    const buyList = buildBuyList(decks)

    expect(buyList.map(i => i.cardName)).not.toContain('Harmonic Prodigy')
  })
})

// ── Store-level tests ────────────────────────────────────────────────────────
// The store only reaches the outside world through `window.electronAPI`, so a stub of
// that object stands in for the main process. Every read returns a fresh clone, exactly
// as IPC does, which is what makes "nothing changed" a meaningful thing to assert.

interface FakeDisk {
  decks: Deck[]
  cardLists: CardList[]
}

function stubElectronApi(disk: FakeDisk, overrides: Record<string, unknown> = {}) {
  const api = {
    listDecks: async () => structuredClone(disk.decks),
    listCardLists: async () => structuredClone(disk.cardLists),
    // Like Storage.getTaxonomy when taxonomy.json is absent: a default with a fresh date.
    getTaxonomy: async () => ({ version: 1, updatedAt: new Date(Math.random() * 1e12).toISOString(), tags: [] }),
    getConfig: async () => ({ theme: 'gothic' }),
    getGlobalRoles: async () => [{ id: 'ramp', name: 'Ramp' }],
    getSetCollection: async () => ({ version: 1, updatedAt: '2026-01-01T00:00:00.000Z', sets: [] }),
    getPullListConfig: async () => ({ version: 1, updatedAt: '2026-01-01T00:00:00.000Z' }),
    ...overrides,
  }
  vi.stubGlobal('window', { electronAPI: api })
  return api
}

const initialState = useStore.getState()

describe('loadData', () => {
  beforeEach(() => useStore.setState(initialState, true))
  afterEach(() => vi.unstubAllGlobals())

  it('is a no-op the second time: no subscriber is notified and nothing changes identity', async () => {
    stubElectronApi({
      decks: [deck('d1', 'One', [{ name: 'mainboard', entries: [entry('Opt', 1, 'owned')] }]), deck('d2', 'Two', [])],
      cardLists: [],
    })
    await useStore.getState().loadData()
    const first = useStore.getState()
    const listener = vi.fn()
    const unsubscribe = useStore.subscribe(listener)

    await useStore.getState().loadData()
    unsubscribe()

    expect(listener).not.toHaveBeenCalled()
    expect(useStore.getState().decks).toBe(first.decks)
    expect(useStore.getState().taxonomy).toBe(first.taxonomy)
  })

  it('replaces only the deck that changed on disk', async () => {
    const disk: FakeDisk = { decks: [deck('d1', 'One', []), deck('d2', 'Two', [])], cardLists: [] }
    stubElectronApi(disk)
    await useStore.getState().loadData()
    const before = useStore.getState().decks

    // Another process (the MCP server) saves d2.
    disk.decks[1] = { ...disk.decks[1], name: 'Two, renamed', version: 2, updatedAt: '2026-02-02T00:00:00.000Z' }
    await useStore.getState().loadData()
    const after = useStore.getState().decks

    expect(after[0]).toBe(before[0])
    expect(after[1]).not.toBe(before[1])
    expect(after[1].name).toBe('Two, renamed')
  })
})

describe('card list saves', () => {
  beforeEach(() => useStore.setState(initialState, true))
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the saved list in step with disk, so the reload that follows a save changes nothing', async () => {
    const disk: FakeDisk = { decks: [], cardLists: [] }
    stubElectronApi(disk, {
      // Like Storage.saveCardList behind IPC: stamps a clone, returns it.
      saveCardList: async (list: CardList) => {
        const saved = { ...structuredClone(list), version: list.version + 1, updatedAt: '2026-03-03T00:00:00.000Z' }
        disk.cardLists = [...disk.cardLists.filter(l => l.id !== saved.id), saved]
        return saved
      },
    })
    await useStore.getState().loadData()

    await useStore.getState().createCardList({ name: 'Wishlist' })
    const afterSave = useStore.getState().cardLists
    await useStore.getState().loadData()

    expect(afterSave[0].updatedAt).toBe('2026-03-03T00:00:00.000Z')
    expect(useStore.getState().cardLists).toBe(afterSave)
  })
})
