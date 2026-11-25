import { describe, it, expect } from 'vitest'
import { reconcileVersioned, keepIfEqual, applyLoaded, type LoadedData, type LoadedState } from './reconcile'

interface Item { id: string; version: number; updatedAt: string; body?: string }

const item = (id: string, version: number, updatedAt = 't0'): Item => ({ id, version, updatedAt })

// A reload hands back brand-new objects every time (they cross IPC as clones), so
// "the same data" always arrives with different references.
const reloaded = <T>(value: T): T => structuredClone(value)

describe('reconcileVersioned', () => {
  it('returns prev itself when every item matches', () => {
    const prev = [item('a', 1), item('b', 4)]

    expect(reconcileVersioned(prev, reloaded(prev))).toBe(prev)
  })

  it('replaces only the item whose version changed', () => {
    const prev = [item('a', 1), item('b', 4), item('c', 2)]
    const next = [item('a', 1), item('b', 5, 't1'), item('c', 2)]

    const result = reconcileVersioned(prev, next)

    expect(result[0]).toBe(prev[0])
    expect(result[1]).toBe(next[1])
    expect(result[2]).toBe(prev[2])
  })

  it('treats the same version with a different updatedAt as changed', () => {
    // A restored backup can land on the version number the store already holds.
    const prev = [item('a', 3, 't0')]
    const next = [item('a', 3, 't9')]

    expect(reconcileVersioned(prev, next)[0]).toBe(next[0])
  })

  it('follows the order of next and keeps identities across add, remove and reorder', () => {
    const prev = [item('a', 1), item('b', 1), item('c', 1)]
    const next = [item('c', 1), item('d', 1), item('a', 1)]

    const result = reconcileVersioned(prev, next)

    expect(result.map(i => i.id)).toEqual(['c', 'd', 'a'])
    expect(result[0]).toBe(prev[2])
    expect(result[1]).toBe(next[1])
    expect(result[2]).toBe(prev[0])
  })

  it('is stable: reconciling its own result against the same reload returns it unchanged', () => {
    // After creating a deck the store appends it, but disk order is directory order.
    // The first reload may reorder; the second must be a no-op.
    const prev = [item('b', 1), item('a', 1)]
    const next = [item('a', 1), item('b', 1)]

    const once = reconcileVersioned(prev, next)

    expect(reconcileVersioned(once, reloaded(next))).toBe(once)
  })

  it('returns prev itself for two empty arrays', () => {
    const prev: Item[] = []

    expect(reconcileVersioned(prev, [])).toBe(prev)
  })
})

describe('keepIfEqual', () => {
  it('returns prev for equal content', () => {
    const prev = { theme: 'gothic', sets: ['a', 'b'] }

    expect(keepIfEqual(prev, reloaded(prev))).toBe(prev)
  })

  it('returns prev when only a top-level updatedAt differs', () => {
    // Main stamps updatedAt on save and the renderer keeps its pre-stamp copy; the
    // taxonomy default is rebuilt with a fresh date on every read.
    const prev = { updatedAt: '2026-01-01', entries: [1, 2] }
    const next = { updatedAt: '2026-11-25', entries: [1, 2] }

    expect(keepIfEqual(prev, next)).toBe(prev)
  })

  it('returns next when a field differs', () => {
    const prev = { theme: 'gothic' }
    const next = { theme: 'library' }

    expect(keepIfEqual(prev, next)).toBe(next)
  })

  it('returns next when prev is null', () => {
    const next = { theme: 'gothic' }

    expect(keepIfEqual<{ theme: string } | null>(null, next)).toBe(next)
  })

  it('compares arrays by content', () => {
    const prev = [{ id: 'ramp' }, { id: 'draw' }]

    expect(keepIfEqual(prev, reloaded(prev))).toBe(prev)
    expect(keepIfEqual(prev, [{ id: 'ramp' }])).not.toBe(prev)
  })
})

describe('applyLoaded', () => {
  const loaded = (): LoadedData => ({
    decks: [item('d1', 2), item('d2', 7)],
    cardLists: [item('l1', 1)],
    taxonomy: { updatedAt: 'now', tags: [] },
    config: { theme: 'gothic' },
    globalRoles: [{ id: 'ramp' }],
    setCollection: { updatedAt: 't', sets: [] },
    pullListConfig: { updatedAt: 't', sort: 'name' },
  } as unknown as LoadedData)

  const settled = (data: LoadedData): LoadedState & { selectedDeckId: string } => ({
    ...data,
    isLoading: false,
    hasInitialized: true,
    error: null,
    selectedDeckId: 'd1',
  })

  it('returns the same state reference when the reload changed nothing', () => {
    const state = settled(loaded())

    expect(applyLoaded(state, loaded())).toBe(state)
  })

  it('ignores a fresh updatedAt on the taxonomy default', () => {
    const state = settled(loaded())
    const next = { ...loaded(), taxonomy: { updatedAt: 'later', tags: [] } } as unknown as LoadedData

    expect(applyLoaded(state, next)).toBe(state)
  })

  it('changes only the slice that changed, and leaves unrelated state alone', () => {
    const state = settled(loaded())
    const next = loaded()
    next.decks[1] = item('d2', 8, 't1') as unknown as LoadedData['decks'][number]

    const result = applyLoaded(state, next)

    expect(result).not.toBe(state)
    expect(result.decks[0]).toBe(state.decks[0])
    expect(result.decks[1]).toBe(next.decks[1])
    expect(result.cardLists).toBe(state.cardLists)
    expect(result.config).toBe(state.config)
    expect(result.selectedDeckId).toBe('d1')
  })

  it('settles the loading flags on first load', () => {
    const initial: LoadedState = {
      decks: [], cardLists: [], taxonomy: null, config: null, globalRoles: [],
      setCollection: null, pullListConfig: null,
      isLoading: true, hasInitialized: false, error: 'stale',
    }

    const result = applyLoaded(initial, loaded())

    expect(result.isLoading).toBe(false)
    expect(result.hasInitialized).toBe(true)
    expect(result.error).toBeNull()
    expect(result.decks).toHaveLength(2)
  })
})
