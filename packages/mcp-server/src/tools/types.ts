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
  ownership?: string
  to_alternates?: boolean
  to_sideboard?: boolean
  from_alternates?: boolean
  from_sideboard?: boolean
  add_roles?: string[]
  remove_roles?: string[]
  notes?: string
  from?: string
  to?: string
  force?: boolean
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

export type GetDeckDetail = 'summary' | 'full'

export interface DeckListArgs {
  deck_id: string
  detail?: DetailLevel
  sort_by?: string
  group_by?: string
  filters?: import('@mtg-deckbuilder/shared').CardFilter[]
}

export interface DeckCurveArgs {
  deck_id: string
  filters?: import('@mtg-deckbuilder/shared').CardFilter[]
}

export interface DeckNotesArgs {
  deck_id: string
}

export interface DeckPullListArgs {
  deck_id: string
}

export type DeckExportFormatId = 'arena' | 'moxfield' | 'archidekt' | 'mtgo' | 'simple'

export interface DeckExportArgs {
  deck_id: string
  format: DeckExportFormatId
  include_sideboard?: boolean
  include_maybeboard?: boolean
}

export interface ManageRoleArgs {
  action: 'add_custom' | 'add_global' | 'update_global' | 'delete_global' | 'update_custom' | 'delete_custom'
  deck_id?: string
  id: string
  name?: string
  description?: string
  color?: string
}

export interface ManageCommanderArgs {
  action: 'add' | 'remove' | 'swap'
  deck_id: string
  commander_name: string
  set_code?: string
  collector_number?: string
  new_commander_name?: string
  new_set_code?: string
  new_collector_number?: string
  force?: boolean
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
  force?: boolean
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

// Runtime validation helpers

function requireString(args: Record<string, unknown>, field: string): string {
  const value = args[field]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`'${field}' is required and must be a non-empty string`)
  }
  return value
}

function requireEnum<T extends string>(args: Record<string, unknown>, field: string, allowed: readonly T[]): T {
  const value = requireString(args, field)
  if (!allowed.includes(value as T)) {
    throw new Error(`'${field}' must be one of: ${allowed.join(', ')} (got '${value}')`)
  }
  return value as T
}

export function validateManageDeckArgs(args: Record<string, unknown>): ManageDeckArgs {
  return {
    action: requireEnum(args, 'action', ['create', 'update', 'delete'] as const),
    deck_id: args.deck_id as string | undefined,
    name: args.name as string | undefined,
    format: args.format as string | undefined,
    archetype: args.archetype as string | undefined,
    description: args.description as string | undefined,
  }
}

export function validateManageCardArgs(args: Record<string, unknown>): ManageCardArgs {
  return {
    action: requireEnum(args, 'action', ['add', 'remove', 'update', 'move'] as const),
    deck_id: requireString(args, 'deck_id'),
    name: args.name as string | undefined,
    cards: args.cards as string[] | undefined,
    set_code: args.set_code as string | undefined,
    collector_number: args.collector_number as string | undefined,
    quantity: args.quantity as number | undefined,
    roles: args.roles as string[] | undefined,
    ownership: args.ownership as string | undefined,
    to_alternates: args.to_alternates as boolean | undefined,
    to_sideboard: args.to_sideboard as boolean | undefined,
    from_alternates: args.from_alternates as boolean | undefined,
    from_sideboard: args.from_sideboard as boolean | undefined,
    add_roles: args.add_roles as string[] | undefined,
    remove_roles: args.remove_roles as string[] | undefined,
    notes: args.notes as string | undefined,
    from: args.from as string | undefined,
    to: args.to as string | undefined,
    force: args.force as boolean | undefined,
  }
}

export function validateSearchCardsArgs(args: Record<string, unknown>): SearchCardsArgs {
  return {
    query: requireString(args, 'query'),
    exact: args.exact as boolean | undefined,
    limit: args.limit as number | undefined,
    set_code: args.set_code as string | undefined,
    collector_number: args.collector_number as string | undefined,
    format: args.format as 'compact' | 'json' | undefined,
  }
}

export function validateDeckListArgs(args: Record<string, unknown>): DeckListArgs {
  const detail = args.detail
  if (detail !== undefined && detail !== 'summary' && detail !== 'compact' && detail !== 'full') {
    throw new Error(`'detail' must be 'summary', 'compact', or 'full' (got '${String(detail)}')`)
  }
  return {
    deck_id: requireString(args, 'deck_id'),
    detail: detail as DetailLevel | undefined,
    sort_by: args.sort_by as string | undefined,
    group_by: args.group_by as string | undefined,
    filters: args.filters as import('@mtg-deckbuilder/shared').CardFilter[] | undefined,
  }
}

export function validateDeckCurveArgs(args: Record<string, unknown>): DeckCurveArgs {
  return {
    deck_id: requireString(args, 'deck_id'),
    filters: args.filters as import('@mtg-deckbuilder/shared').CardFilter[] | undefined,
  }
}

export function validateDeckNotesArgs(args: Record<string, unknown>): DeckNotesArgs {
  return { deck_id: requireString(args, 'deck_id') }
}

export function validateDeckPullListArgs(args: Record<string, unknown>): DeckPullListArgs {
  return { deck_id: requireString(args, 'deck_id') }
}

const DECK_EXPORT_FORMATS = ['arena', 'moxfield', 'archidekt', 'mtgo', 'simple'] as const

export function validateDeckExportArgs(args: Record<string, unknown>): DeckExportArgs {
  return {
    deck_id: requireString(args, 'deck_id'),
    format: requireEnum(args, 'format', DECK_EXPORT_FORMATS),
    include_sideboard: args.include_sideboard as boolean | undefined,
    include_maybeboard: args.include_maybeboard as boolean | undefined,
  }
}

export function validateManageRoleArgs(args: Record<string, unknown>): ManageRoleArgs {
  return {
    action: requireEnum(args, 'action', ['add_custom', 'add_global', 'update_global', 'delete_global', 'update_custom', 'delete_custom'] as const),
    deck_id: args.deck_id as string | undefined,
    id: requireString(args, 'id'),
    name: args.name as string | undefined,
    description: args.description as string | undefined,
    color: args.color as string | undefined,
  }
}

export function validateManageCommanderArgs(args: Record<string, unknown>): ManageCommanderArgs {
  return {
    action: requireEnum(args, 'action', ['add', 'remove', 'swap'] as const),
    deck_id: requireString(args, 'deck_id'),
    commander_name: requireString(args, 'commander_name'),
    set_code: args.set_code as string | undefined,
    collector_number: args.collector_number as string | undefined,
    new_commander_name: args.new_commander_name as string | undefined,
    new_set_code: args.new_set_code as string | undefined,
    new_collector_number: args.new_collector_number as string | undefined,
    force: args.force as boolean | undefined,
  }
}

export function validateManageInterestListArgs(args: Record<string, unknown>): ManageInterestListArgs {
  return {
    action: requireEnum(args, 'action', ['add', 'remove'] as const),
    name: args.name as string | undefined,
    card_name: args.card_name as string | undefined,
    set_code: args.set_code as string | undefined,
    collector_number: args.collector_number as string | undefined,
    notes: args.notes as string | undefined,
    potential_decks: args.potential_decks as string[] | undefined,
    source: args.source as string | undefined,
    force: args.force as boolean | undefined,
  }
}

export function validateManageDeckNoteArgs(args: Record<string, unknown>): ManageDeckNoteArgs {
  return {
    action: requireEnum(args, 'action', ['add', 'update', 'delete'] as const),
    deck_id: requireString(args, 'deck_id'),
    note_id: args.note_id as string | undefined,
    title: args.title as string | undefined,
    content: args.content as string | undefined,
    note_type: args.note_type as NoteType | undefined,
    card_names: args.card_names as string[] | undefined,
    role_id: args.role_id as string | undefined,
    remove_role: args.remove_role as boolean | undefined,
  }
}
