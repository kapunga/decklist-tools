import type { Deck, Taxonomy, CardList, Config, RoleDefinition, SetCollectionFile, PullListConfig } from '@/types'

// Reloading from disk hands back brand-new objects for everything, changed or not. In
// React and Zustand a new reference *is* the change signal, so replacing the store
// wholesale re-renders the whole app and re-runs every effect keyed on a deck — after
// every save, including the app's own. These functions merge a reload into the store
// instead: whatever did not change keeps the object the store already holds.

interface Versioned {
  id: string
  version?: number
  updatedAt?: string
}

// `updatedAt` is part of the key because a restored backup can land on a version number
// the store already holds; every writer stamps a fresh `updatedAt` alongside the bump.
const sameRevision = (a: Versioned, b: Versioned): boolean =>
  a.version === b.version && a.updatedAt === b.updatedAt

const sameItems = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((item, i) => item === b[i])

/**
 * Merge a freshly loaded list of versioned items into the list already held. The result
 * follows `next`'s order and uses `prev`'s object wherever id, version and updatedAt
 * match. When nothing differs at all it returns `prev` itself.
 */
export function reconcileVersioned<T extends Versioned>(prev: readonly T[], next: readonly T[]): T[] {
  const held = new Map(prev.map(item => [item.id, item]))
  const merged = next.map(item => {
    const existing = held.get(item.id)
    return existing && sameRevision(existing, item) ? existing : item
  })
  return sameItems(prev, merged) ? (prev as T[]) : merged
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Main stamps `updatedAt` on save while the renderer keeps its pre-stamp copy, and the
// taxonomy default is rebuilt with a fresh date on every read. A real change always
// touches some other field too, so the stamp alone is not a difference.
const comparable = (value: unknown): string =>
  JSON.stringify(isRecord(value) ? { ...value, updatedAt: undefined } : value)

/** `prev` if it has the same content as `next` (ignoring a top-level `updatedAt`), else `next`. */
export function keepIfEqual<T>(prev: T, next: T): T {
  return comparable(prev) === comparable(next) ? prev : next
}

/** Everything `loadData` reads from disk. */
export interface LoadedData {
  decks: Deck[]
  cardLists: CardList[]
  taxonomy: Taxonomy
  config: Config
  globalRoles: RoleDefinition[]
  setCollection: SetCollectionFile
  pullListConfig: PullListConfig
}

/** The part of the store `loadData` owns: the loaded data plus its own status flags. */
export interface LoadedState {
  decks: Deck[]
  cardLists: CardList[]
  taxonomy: Taxonomy | null
  config: Config | null
  globalRoles: RoleDefinition[]
  setCollection: SetCollectionFile | null
  pullListConfig: PullListConfig | null
  isLoading: boolean
  hasInitialized: boolean
  error: string | null
}

const reconcileLoaded = (state: LoadedState, loaded: LoadedData): LoadedState => ({
  decks: reconcileVersioned(state.decks, loaded.decks),
  cardLists: reconcileVersioned(state.cardLists, loaded.cardLists),
  taxonomy: keepIfEqual(state.taxonomy, loaded.taxonomy),
  config: keepIfEqual(state.config, loaded.config),
  globalRoles: keepIfEqual(state.globalRoles, loaded.globalRoles),
  setCollection: keepIfEqual(state.setCollection, loaded.setCollection),
  pullListConfig: keepIfEqual(state.pullListConfig, loaded.pullListConfig),
  isLoading: false,
  hasInitialized: true,
  error: null,
})

const sameFields = (state: LoadedState, next: LoadedState): boolean =>
  (Object.keys(next) as (keyof LoadedState)[]).every(key => Object.is(state[key], next[key]))

/**
 * Fold a reload into the store. Returns `state` itself — the same reference — when the
 * reload changed nothing, which is how Zustand knows to notify no one.
 */
export function applyLoaded<S extends LoadedState>(state: S, loaded: LoadedData): S {
  const next = reconcileLoaded(state, loaded)
  return sameFields(state, next) ? state : { ...state, ...next }
}
