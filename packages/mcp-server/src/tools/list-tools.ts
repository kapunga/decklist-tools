import {
  Storage,
  CARD_SET,
  CARD_SOURCE,
  CARD_LIST_KIND,
  CARD_LIST_KIND_DEFAULT_DESCRIPTIONS,
  INTEREST_LIST_ID,
  isValidUUID,
  makeCardEntry,
  getPrimaryType,
  createCardIdentifier,
  getCardListKind,
} from '@mtg-deckbuilder/shared'
import type {
  CardEntry,
  CardList,
  CardListKind,
  CardSource,
} from '@mtg-deckbuilder/shared'
import { randomUUID } from 'node:crypto'
import { fetchScryfallCard } from './helpers.js'
import type { ManageCardListArgs } from './types.js'

function getMainEntries(list: CardList): CardEntry[] {
  return list.cardSets[0]?.entries ?? []
}

function setMainEntries(list: CardList, entries: CardEntry[]): CardList {
  const firstSet = list.cardSets[0]
  const setName = firstSet?.name ?? CARD_SET.MAINBOARD
  return { ...list, cardSets: [{ name: setName, entries }] }
}

function findListByIdentifier(storage: Storage, identifier: string): CardList | null {
  if (isValidUUID(identifier)) {
    return storage.getCardList(identifier)
  }
  const target = identifier.trim().toLowerCase()
  return storage.listCardLists().find(l => l.name.toLowerCase() === target) ?? null
}

function getListOrThrow(storage: Storage, identifier: string): CardList {
  const list = findListByIdentifier(storage, identifier)
  if (!list) throw new Error(`Card list not found: ${identifier}`)
  return list
}

export function listCardLists(storage: Storage) {
  return storage.listCardLists().map(list => ({
    id: list.id,
    name: list.name,
    kind: getCardListKind(list),
    description: list.description ?? '',
    cardCount: getMainEntries(list).length,
    updatedAt: list.updatedAt,
  }))
}

export function getCardList(storage: Storage, identifier: string) {
  return getListOrThrow(storage, identifier)
}

function defaultDescriptionForKind(kind: CardListKind): string {
  return CARD_LIST_KIND_DEFAULT_DESCRIPTIONS[kind]
}

export async function manageCardList(storage: Storage, args: ManageCardListArgs) {
  switch (args.action) {
    case 'create': {
      if (!args.name) throw new Error('name is required for create')
      const kind = (args.kind ?? CARD_LIST_KIND.CUSTOM) as CardListKind
      const now = new Date().toISOString()
      const list: CardList = {
        id: randomUUID(),
        name: args.name,
        description: args.description ?? defaultDescriptionForKind(kind),
        kind,
        version: 0,
        createdAt: now,
        updatedAt: now,
        cardSets: [{ name: CARD_SET.MAINBOARD, entries: [] }],
      }
      storage.saveCardList(list)
      return { success: true, list }
    }
    case 'delete': {
      if (!args.id) throw new Error('id is required for delete')
      if (args.id === INTEREST_LIST_ID) {
        throw new Error('The well-known interest list cannot be deleted.')
      }
      const ok = storage.deleteCardList(args.id)
      if (!ok) throw new Error(`Card list not found: ${args.id}`)
      return { success: true }
    }
    case 'rename': {
      if (!args.id) throw new Error('id is required for rename')
      if (!args.name) throw new Error('name is required for rename')
      const list = getListOrThrow(storage, args.id)
      const updated: CardList = {
        ...list,
        name: args.name,
        description: args.description ?? list.description,
      }
      storage.saveCardList(updated)
      return { success: true }
    }
    case 'add': {
      if (!args.id) throw new Error('id is required for add')
      if (!args.name) throw new Error('name (card name) is required for add')
      const list = getListOrThrow(storage, args.id)
      const card = await fetchScryfallCard(
        storage,
        args.name,
        args.set_code,
        args.collector_number,
        { force: args.force },
      )
      const source: CardSource =
        args.source === 'import' || args.source === 'claude' ? args.source : CARD_SOURCE.USER
      const entry = makeCardEntry({
        card: createCardIdentifier(card),
        notes: args.notes,
        potentialDecks: args.potential_decks,
        quantity: args.quantity,
        source,
        primaryType: getPrimaryType(card.type_line),
      })
      const updated = setMainEntries(list, [...getMainEntries(list), entry])
      storage.saveCardList(updated)
      return { success: true, item: entry }
    }
    case 'remove': {
      if (!args.id) throw new Error('id is required for remove')
      if (!args.card_name) throw new Error('card_name is required for remove')
      const list = getListOrThrow(storage, args.id)
      const entries = getMainEntries(list)
      const idx = entries.findIndex(
        e => e.card.name.toLowerCase() === args.card_name!.toLowerCase(),
      )
      if (idx === -1) throw new Error(`Card not found in list: ${args.card_name}`)
      const next = entries.filter((_, i) => i !== idx)
      storage.saveCardList(setMainEntries(list, next))
      return { success: true }
    }
    default:
      throw new Error(`Unknown action: ${(args as { action: string }).action}`)
  }
}
