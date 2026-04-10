import type { Deck, Taxonomy, CardList, Config, CardEntry, DeckNote, CardIdentifier, RoleDefinition, SetCollectionFile, SetCollectionEntry, CollectionLevel, PullListConfig, CardSetName, CardSource } from '@/types'

export type AppView = 'decks' | 'deck-detail' | 'interest-list' | 'buy-list' | 'settings'

export interface AppState
  extends DeckSlice,
    CardSlice,
    CommanderSlice,
    RoleSlice,
    NoteSlice,
    InterestListSlice,
    ConfigSlice,
    SelectionSlice,
    SetCollectionSlice,
    PullListSlice {
  // Data
  decks: Deck[]
  taxonomy: Taxonomy | null
  cardLists: CardList[]
  config: Config | null
  globalRoles: RoleDefinition[]
  setCollection: SetCollectionFile | null
  pullListConfig: PullListConfig | null

  // UI State
  selectedDeckId: string | null
  currentView: AppView
  isLoading: boolean
  hasInitialized: boolean
  error: string | null

  // Core actions
  loadData: () => Promise<void>
  selectDeck: (id: string | null) => void
  setView: (view: AppView) => void
}

export interface DeckSlice {
  createDeck: (name: string, formatType: string) => Promise<Deck>
  updateDeck: (deck: Deck) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  setDeckArtCard: (deckId: string, scryfallId: string | undefined) => Promise<void>
  setDeckColorIdentity: (deckId: string, colors: string[]) => Promise<void>
}

export interface CardSlice {
  addCardToDeck: (deckId: string, card: CardEntry, target?: CardSetName) => Promise<void>
  removeCardFromDeck: (deckId: string, cardName: string, target?: CardSetName) => Promise<void>
  updateCardInDeck: (deckId: string, cardName: string, updates: Partial<CardEntry>) => Promise<void>
  moveCard: (deckId: string, cardName: string, from: CardSetName, to: CardSetName) => Promise<void>
}

export interface CommanderSlice {
  setCommanders: (deckId: string, commanders: CardIdentifier[]) => Promise<void>
  addCommander: (deckId: string, commander: CardIdentifier) => Promise<void>
  removeCommander: (deckId: string, commanderName: string) => Promise<void>
}

export interface RoleSlice {
  addRoleToCard: (deckId: string, cardName: string, roleId: string) => Promise<void>
  removeRoleFromCard: (deckId: string, cardName: string, roleId: string) => Promise<void>
  setCardRoles: (deckId: string, cardName: string, roles: string[]) => Promise<void>
  addCustomRole: (deckId: string, role: RoleDefinition) => Promise<void>
  updateCustomRole: (deckId: string, roleId: string, updates: Partial<RoleDefinition>) => Promise<void>
  removeCustomRole: (deckId: string, roleId: string) => Promise<void>
  addGlobalRole: (role: RoleDefinition) => Promise<void>
  updateGlobalRole: (roleId: string, updates: Partial<RoleDefinition>) => Promise<void>
  deleteGlobalRole: (roleId: string) => Promise<void>
}

export interface NoteSlice {
  addNote: (deckId: string, note: Omit<DeckNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateNote: (deckId: string, noteId: string, updates: Partial<Pick<DeckNote, 'title' | 'content' | 'noteType' | 'cardRefs' | 'roleId'>>) => Promise<void>
  deleteNote: (deckId: string, noteId: string, removeRole?: boolean) => Promise<void>
}

export interface InterestListSlice {
  addToInterestList: (card: CardIdentifier, notes?: string, source?: CardSource) => Promise<void>
  removeFromInterestList: (cardName: string) => Promise<void>
  updateInterestItem: (cardName: string, updates: { notes?: string; potentialDecks?: string[] }) => Promise<void>
}

export interface ConfigSlice {
  updateConfig: (config: Partial<Config>) => Promise<void>
}

export interface SetCollectionSlice {
  addSetToCollection: (entry: Omit<SetCollectionEntry, 'addedAt'>) => Promise<void>
  updateSetInCollection: (setCode: string, level: CollectionLevel) => Promise<void>
  removeSetFromCollection: (setCode: string) => Promise<void>
}

export interface PullListSlice {
  loadPullListConfig: () => Promise<void>
  updatePullListConfig: (updates: Partial<PullListConfig>) => Promise<void>
  pullCards: (deckId: string, cardName: string, setCode: string, collectorNumber: string, quantity: number) => Promise<void>
  unpullCards: (deckId: string, cardName: string, setCode: string, collectorNumber: string, quantity: number) => Promise<void>
  resetPulledStatus: (deckId: string) => Promise<void>
}

export interface SelectionSlice {
  selectedCards: Set<string>
  focusedCardId: string | null
  selectCard: (cardName: string) => void
  deselectCard: (cardName: string) => void
  toggleCardSelection: (cardName: string) => void
  selectAllCards: (cardNames: string[]) => void
  clearSelection: () => void
  setFocusedCard: (cardId: string | null) => void
  batchUpdateOwnership: (deckId: string, cardNames: string[], ownership: CardEntry['ownership']) => Promise<void>
  batchRemoveCards: (deckId: string, cardNames: string[], listType: CardSetName) => Promise<void>
  batchMoveCards: (deckId: string, cardNames: string[], from: CardSetName, to: CardSetName) => Promise<void>
  batchAddRoleToCards: (deckId: string, cardNames: string[], roleId: string) => Promise<void>
}

export type SliceCreator<T> = (
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState
) => T
