import type { NoteType } from '@mtg-deckbuilder/shared'

export interface ManageDeckArgs {
  action: 'create' | 'update' | 'delete'
  deck_id?: string
  name?: string
  format?: string
  archetype?: string
  description?: string
}

export interface ManageCardArgs {
  action: 'add' | 'remove' | 'update' | 'move'
  deck_id: string
  name?: string
  cards?: string[]
  set_code?: string
  collector_number?: string
  quantity?: number
  roles?: string[]
  status?: string
  ownership?: string
  to_alternates?: boolean
  to_sideboard?: boolean
  from_alternates?: boolean
  from_sideboard?: boolean
  add_roles?: string[]
  remove_roles?: string[]
  pinned?: boolean
  notes?: string
  from?: string
  to?: string
}

export interface SearchCardsArgs {
  query: string
  exact?: boolean
  limit?: number
  set_code?: string
  collector_number?: string
  format?: 'compact' | 'json'
}

export type DetailLevel = 'summary' | 'compact' | 'full'

export interface ViewDeckArgs {
  deck_id: string
  view?: string
  detail?: DetailLevel
  sort_by?: string
  group_by?: string
  filters?: import('@mtg-deckbuilder/shared').CardFilter[]
}

export interface ManageRoleArgs {
  action: 'add_custom' | 'add_global' | 'update_global' | 'delete_global' | 'update_custom' | 'delete_custom'
  deck_id?: string
  id: string
  name?: string
  description?: string
  color?: string
}

export interface SetCommandersArgs {
  deck_id: string
  commander_name: string
  set_code?: string
  collector_number?: string
}

export interface ManageInterestListArgs {
  action: 'add' | 'remove'
  name?: string
  card_name?: string
  set_code?: string
  collector_number?: string
  notes?: string
  potential_decks?: string[]
  source?: string
}

export interface ManageDeckNoteArgs {
  action: 'add' | 'update' | 'delete'
  deck_id: string
  note_id?: string
  title?: string
  content?: string
  note_type?: NoteType
  card_names?: string[]
  role_id?: string
  remove_role?: boolean
}

export interface GetCollectionFilterArgs {
  // No arguments required
}
