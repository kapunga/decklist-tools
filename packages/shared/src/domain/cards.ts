import type { Deck, DeckCard, DeckListName } from '../types/index.js'
import { DECK_LIST, INCLUSION_STATUS } from '../types/index.js'
import { findCardByName, findCardIndexByName } from '../utils/card-utils.js'
import type { InclusionStatus, OwnershipStatus } from '../types/index.js'
import type { OpResult, AddCardMeta, RemoveCardMeta, MoveCardMeta, UpdateCardMeta } from './types.js'

// --- Helpers ---

/** Get the card array for a given list name from a deck. */
function getList(deck: Deck, listName: DeckListName): DeckCard[] {
  switch (listName) {
    case DECK_LIST.MAINBOARD: return deck.cards
    case DECK_LIST.SIDEBOARD: return deck.sideboard
    case DECK_LIST.ALTERNATES: return deck.alternates
  }
}

/** Return a new deck with the specified list replaced. */
function withList(deck: Deck, listName: DeckListName, list: DeckCard[]): Deck {
  switch (listName) {
    case DECK_LIST.MAINBOARD: return { ...deck, cards: list }
    case DECK_LIST.SIDEBOARD: return { ...deck, sideboard: list }
    case DECK_LIST.ALTERNATES: return { ...deck, alternates: list }
  }
}

// --- Core Operations ---

/**
 * Merge a card into a list. If a card with the same name exists,
 * increments quantity and unions roles. Otherwise appends.
 * Returns a new array — does not mutate the input.
 */
export function mergeCardIntoList(list: DeckCard[], card: DeckCard): { list: DeckCard[]; merged: boolean } {
  const existingIndex = findCardIndexByName(list, card.card.name)

  if (existingIndex >= 0) {
    const existing = list[existingIndex]
    // Upgrade inclusion: confirmed wins over considering (explicit add confirms the card)
    const inclusion = card.inclusion === INCLUSION_STATUS.CONFIRMED
      ? INCLUSION_STATUS.CONFIRMED
      : existing.inclusion
    const mergedCard: DeckCard = {
      ...existing,
      quantity: existing.quantity + card.quantity,
      inclusion,
      roles: [...new Set([...existing.roles, ...card.roles])],
      isPinned: existing.isPinned || card.isPinned,
      notes: existing.notes && card.notes && existing.notes !== card.notes
        ? `${existing.notes}\n${card.notes}`
        : card.notes || existing.notes,
    }
    const newList = [...list]
    newList[existingIndex] = mergedCard
    return { list: newList, merged: true }
  }

  return { list: [...list, { ...card, roles: [...card.roles] }], merged: false }
}

/**
 * Add a card to a deck's target list. Merges if a card with the same name
 * already exists in that list.
 */
export function addCardToDeck(deck: Deck, card: DeckCard, target: DeckListName): OpResult<AddCardMeta> {
  const currentList = getList(deck, target)
  const { list: newList, merged } = mergeCardIntoList(currentList, card)
  return {
    deck: withList(deck, target, newList),
    meta: { merged },
  }
}

/**
 * Remove a card (or reduce its quantity) from a deck's target list.
 * If quantity is specified and less than the card's current quantity,
 * decrements. Otherwise removes entirely.
 */
export function removeCardFromDeck(
  deck: Deck,
  cardName: string,
  target: DeckListName,
  quantity?: number
): OpResult<RemoveCardMeta> {
  const currentList = getList(deck, target)
  const index = findCardIndexByName(currentList, cardName)

  if (index === -1) {
    throw new Error(`Card not found in ${target}: ${cardName}`)
  }

  const card = currentList[index]
  let newList: DeckCard[]
  let remainingQty: number

  if (quantity !== undefined && quantity < card.quantity) {
    const updated = { ...card, quantity: card.quantity - quantity }
    newList = [...currentList]
    newList[index] = updated
    remainingQty = updated.quantity
  } else {
    newList = currentList.filter((_, i) => i !== index)
    remainingQty = 0
  }

  return {
    deck: withList(deck, target, newList),
    meta: { removed: true, remainingQty },
  }
}

/**
 * Move a card from one list to another. If the card already exists in the
 * target list, merges (quantity + roles). Otherwise moves the entry.
 */
export function moveCard(
  deck: Deck,
  cardName: string,
  from: DeckListName,
  to: DeckListName
): OpResult<MoveCardMeta> {
  const fromList = getList(deck, from)
  const index = findCardIndexByName(fromList, cardName)

  if (index === -1) {
    throw new Error(`Card not found in ${from}: ${cardName}`)
  }

  const card = fromList[index]
  const newFromList = fromList.filter((_, i) => i !== index)
  const toList = getList(deck, to)
  const { list: newToList, merged } = mergeCardIntoList(toList, card)

  let newDeck = withList(deck, from, newFromList)
  newDeck = withList(newDeck, to, newToList)

  return {
    deck: newDeck,
    meta: {
      moved: merged ? [] : [cardName],
      merged: merged ? [cardName] : [],
    },
  }
}

/** Partial card field updates. */
export interface CardFieldUpdates {
  roles?: string[]
  addRoles?: string[]
  removeRoles?: string[]
  inclusion?: InclusionStatus
  ownership?: OwnershipStatus
  isPinned?: boolean
  notes?: string
}

/**
 * Update card fields across all lists. Finds the card by name and applies
 * the specified updates immutably. Returns the new deck.
 */
export function updateCardInDeck(
  deck: Deck,
  cardName: string,
  updates: CardFieldUpdates
): OpResult<UpdateCardMeta> {
  const updatedFields: string[] = []

  const applyUpdates = (card: DeckCard): DeckCard => {
    let updated = { ...card }

    if (updates.roles !== undefined) {
      updated.roles = updates.roles
      updatedFields.push('roles')
    }
    if (updates.addRoles) {
      updated.roles = [...new Set([...updated.roles, ...updates.addRoles])]
      updatedFields.push('roles')
    }
    if (updates.removeRoles) {
      updated.roles = updated.roles.filter(r => !updates.removeRoles!.includes(r))
      updatedFields.push('roles')
    }
    if (updates.inclusion !== undefined) {
      updated.inclusion = updates.inclusion
      updatedFields.push('inclusion')
    }
    if (updates.ownership !== undefined) {
      updated.ownership = updates.ownership
      updatedFields.push('ownership')
    }
    if (updates.isPinned !== undefined) {
      updated.isPinned = updates.isPinned
      updatedFields.push('isPinned')
    }
    if (updates.notes !== undefined) {
      updated.notes = updates.notes
      updatedFields.push('notes')
    }

    return updated
  }

  const updateList = (list: DeckCard[]): DeckCard[] => {
    const index = findCardIndexByName(list, cardName)
    if (index === -1) return list
    return list.map((c, i) => i === index ? applyUpdates(c) : c)
  }

  // Check card exists somewhere
  const found = findCardByName([...deck.cards, ...deck.alternates, ...deck.sideboard], cardName)
  if (!found) throw new Error(`Card not found in deck: ${cardName}`)

  return {
    deck: {
      ...deck,
      cards: updateList(deck.cards),
      alternates: updateList(deck.alternates),
      sideboard: updateList(deck.sideboard),
    },
    meta: { updatedFields: [...new Set(updatedFields)] },
  }
}

/**
 * Find a card by name across all three lists.
 * Returns the card and which list it's in, or undefined if not found.
 */
export function findCardAcrossLists(
  deck: Deck,
  cardName: string
): { card: DeckCard; list: DeckListName } | undefined {
  const lists: DeckListName[] = [DECK_LIST.MAINBOARD, DECK_LIST.SIDEBOARD, DECK_LIST.ALTERNATES]

  for (const listName of lists) {
    const card = findCardByName(getList(deck, listName), cardName)
    if (card) return { card, list: listName }
  }

  return undefined
}
