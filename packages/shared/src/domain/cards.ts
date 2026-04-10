import type { CardEntry, CardIdentifier, CardSetName, CardSource, Deck, OwnershipStatus, PulledPrinting } from '../types/index.js'
import { CARD_SOURCE, OWNERSHIP_STATUS, generateDeckCardId } from '../types/index.js'
import { findCardByName, findCardIndexByName } from '../utils/card-utils.js'
import { getCardSetEntries, withDeckCardSet, getAllDeckEntries } from './card-sets.js'
import type { OpResult, AddCardMeta, RemoveCardMeta, MoveCardMeta, UpdateCardMeta } from './types.js'

// --- Factory ---

/** Inputs for `makeCardEntry`. Required fields with sensible defaults can be omitted. */
export interface MakeCardEntryInput {
  card: CardIdentifier
  quantity?: number
  ownership?: OwnershipStatus
  roles?: string[]
  source?: CardSource
  typeLine?: string
  notes?: string
  pulledPrintings?: PulledPrinting[]
  potentialDecks?: string[]
}

/**
 * Create a new `CardEntry` with sensible defaults for required fields.
 *
 * Defaults: `quantity: 1`, `ownership: 'unknown'`, `roles: []`, `source: 'user'`.
 * The `id` is auto-generated and `addedAt` is set to the current timestamp.
 *
 * Use this for normal card creation. Synthetic entries (e.g. commander
 * pseudo-cards keyed by `commander-${name}`) should construct their CardEntry
 * inline since they need a deterministic id.
 */
export function makeCardEntry(input: MakeCardEntryInput): CardEntry {
  return {
    id: generateDeckCardId(),
    card: input.card,
    addedAt: new Date().toISOString(),
    quantity: input.quantity ?? 1,
    ownership: input.ownership ?? OWNERSHIP_STATUS.UNKNOWN,
    roles: input.roles ?? [],
    source: input.source ?? CARD_SOURCE.USER,
    typeLine: input.typeLine,
    notes: input.notes,
    pulledPrintings: input.pulledPrintings,
    potentialDecks: input.potentialDecks,
  }
}

// --- Core Operations ---

/**
 * Merge a card into a list. If a card with the same name exists,
 * increments quantity and unions roles. Otherwise appends.
 * Returns a new array — does not mutate the input.
 */
export function mergeCardIntoList(list: CardEntry[], card: CardEntry): { list: CardEntry[]; merged: boolean } {
  const existingIndex = findCardIndexByName(list, card.card.name)

  if (existingIndex >= 0) {
    const existing = list[existingIndex]
    const mergedCard: CardEntry = {
      ...existing,
      quantity: (existing.quantity ?? 0) + (card.quantity ?? 0),
      roles: [...new Set([...(existing.roles ?? []), ...(card.roles ?? [])])],
      notes: existing.notes && card.notes && existing.notes !== card.notes
        ? `${existing.notes}\n${card.notes}`
        : card.notes || existing.notes,
    }
    const newList = [...list]
    newList[existingIndex] = mergedCard
    return { list: newList, merged: true }
  }

  return { list: [...list, { ...card, roles: [...(card.roles ?? [])] }], merged: false }
}

/**
 * Add a card to a deck's target card set. Merges if a card with the same name
 * already exists in that set.
 */
export function addCardToDeck(deck: Deck, card: CardEntry, target: CardSetName): OpResult<AddCardMeta> {
  const currentList = getCardSetEntries(deck.cardSets, target)
  const { list: newList, merged } = mergeCardIntoList(currentList, card)
  return {
    deck: withDeckCardSet(deck, target, newList),
    meta: { merged },
  }
}

/**
 * Remove a card (or reduce its quantity) from a deck's target card set.
 * If quantity is specified and less than the card's current quantity,
 * decrements. Otherwise removes entirely.
 */
export function removeCardFromDeck(
  deck: Deck,
  cardName: string,
  target: CardSetName,
  quantity?: number
): OpResult<RemoveCardMeta> {
  const currentList = getCardSetEntries(deck.cardSets, target)
  const index = findCardIndexByName(currentList, cardName)

  if (index === -1) {
    throw new Error(`Card not found in ${target}: ${cardName}`)
  }

  const card = currentList[index]
  const currentQty = card.quantity ?? 0
  let newList: CardEntry[]
  let remainingQty: number

  if (quantity !== undefined && quantity < currentQty) {
    const updated = { ...card, quantity: currentQty - quantity }
    newList = [...currentList]
    newList[index] = updated
    remainingQty = updated.quantity
  } else {
    newList = currentList.filter((_, i) => i !== index)
    remainingQty = 0
  }

  return {
    deck: withDeckCardSet(deck, target, newList),
    meta: { removed: true, remainingQty },
  }
}

/**
 * Move copies of a card from one card set to another. If the target set already
 * contains the card, quantities and roles are merged (via `mergeCardIntoList`).
 *
 * Quantity rules:
 * - If `quantity` is omitted, the source entry must have exactly 1 copy; otherwise
 *   throws. This prevents accidental bulk moves where a caller meant to cut a single
 *   card but moves an entire stack (e.g. "cut 1 Island" vs. "cut all 15 Islands").
 * - If `quantity` is specified, it must be a positive integer no larger than the
 *   source entry's quantity.
 * - When `quantity` equals the source quantity, the full entry moves and its UUID
 *   is preserved (conceptually "same entry, different set").
 * - When `quantity` is less, the source is decremented and a new entry with a
 *   fresh UUID is created on the target side (a split).
 */
export function moveCard(
  deck: Deck,
  cardName: string,
  from: CardSetName,
  to: CardSetName,
  quantity?: number
): OpResult<MoveCardMeta> {
  const fromList = getCardSetEntries(deck.cardSets, from)
  const index = findCardIndexByName(fromList, cardName)

  if (index === -1) {
    throw new Error(`Card not found in ${from}: ${cardName}`)
  }

  const card = fromList[index]
  const currentQty = card.quantity ?? 1

  let moveQty: number
  if (quantity === undefined) {
    if (currentQty > 1) {
      throw new Error(
        `Must specify quantity: ${cardName} has ${currentQty} copies in ${from}`
      )
    }
    moveQty = currentQty
  } else {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Quantity must be a positive integer: got ${quantity} for ${cardName}`
      )
    }
    if (quantity > currentQty) {
      throw new Error(
        `Cannot move ${quantity} copies of ${cardName}: only ${currentQty} available in ${from}`
      )
    }
    moveQty = quantity
  }

  const isFullMove = moveQty >= currentQty

  let newFromList: CardEntry[]
  let movedEntry: CardEntry

  if (isFullMove) {
    newFromList = fromList.filter((_, i) => i !== index)
    movedEntry = card
  } else {
    const decrementedSource = { ...card, quantity: currentQty - moveQty }
    newFromList = [...fromList]
    newFromList[index] = decrementedSource
    movedEntry = {
      ...card,
      id: generateDeckCardId(),
      quantity: moveQty,
    }
  }

  const toList = getCardSetEntries(deck.cardSets, to)
  const { list: newToList, merged } = mergeCardIntoList(toList, movedEntry)

  let newDeck = withDeckCardSet(deck, from, newFromList)
  newDeck = withDeckCardSet(newDeck, to, newToList)

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
  ownership?: OwnershipStatus
  notes?: string
}

/**
 * Update card fields across all card sets. Finds the card by name and applies
 * the specified updates immutably. Returns the new deck.
 */
export function updateCardInDeck(
  deck: Deck,
  cardName: string,
  updates: CardFieldUpdates
): OpResult<UpdateCardMeta> {
  const updatedFields: string[] = []

  const applyUpdates = (card: CardEntry): CardEntry => {
    let updated = { ...card }

    if (updates.roles !== undefined) {
      updated.roles = updates.roles
      updatedFields.push('roles')
    }
    if (updates.addRoles) {
      updated.roles = [...new Set([...(updated.roles ?? []), ...updates.addRoles])]
      updatedFields.push('roles')
    }
    if (updates.removeRoles) {
      updated.roles = (updated.roles ?? []).filter(r => !updates.removeRoles!.includes(r))
      updatedFields.push('roles')
    }
    if (updates.ownership !== undefined) {
      updated.ownership = updates.ownership
      updatedFields.push('ownership')
    }
    if (updates.notes !== undefined) {
      updated.notes = updates.notes
      updatedFields.push('notes')
    }

    return updated
  }

  // Check card exists somewhere
  const found = findCardByName(getAllDeckEntries(deck), cardName)
  if (!found) throw new Error(`Card not found in deck: ${cardName}`)

  // Map each card set, updating the matching card if present
  const newCardSets = deck.cardSets.map(set => {
    const index = findCardIndexByName(set.entries, cardName)
    if (index === -1) return set
    return {
      name: set.name,
      entries: set.entries.map((c, i) => i === index ? applyUpdates(c) : c),
    }
  })

  return {
    deck: { ...deck, cardSets: newCardSets },
    meta: { updatedFields: [...new Set(updatedFields)] },
  }
}

/**
 * Find a card by name across all card sets in a deck.
 * Returns the card and which set it's in, or undefined if not found.
 */
export function findCardAcrossLists(
  deck: Deck,
  cardName: string
): { card: CardEntry; list: string } | undefined {
  for (const set of deck.cardSets) {
    const card = findCardByName(set.entries, cardName)
    if (card) return { card, list: set.name }
  }

  return undefined
}
