import type { Deck, CardEntry, CardIdentifier } from '../types/index.js'
import { isCommanderLikeFormat, OWNERSHIP_STATUS, CARD_SOURCE } from '../types/index.js'
import { getMainboard, getSideboard } from './card-sets.js'
import type { OpResult, CommanderMeta } from './types.js'

// --- Helpers ---

/** Derive color identity as the union of all CardIdentifiers' colorIdentity fields. */
export function deriveColorIdentity(commanders: CardIdentifier[]): string[] {
  const colors = new Set<string>()
  for (const cmd of commanders) {
    for (const c of cmd.colorIdentity ?? []) {
      colors.add(c)
    }
  }
  return Array.from(colors)
}

function buildMeta(commanders: CardIdentifier[]): CommanderMeta {
  return {
    commanders: commanders.map(c => c.name),
    colorIdentity: deriveColorIdentity(commanders),
  }
}

function requireCommanderLikeFormat(deck: Deck): void {
  if (!isCommanderLikeFormat(deck.format.type)) {
    throw new Error(`Commanders can only be managed for commander-like formats (Commander, Brawl); this deck is ${deck.format.type}`)
  }
}

// --- Operations ---

/**
 * Add a commander to a deck. Recomputes color identity.
 * Throws if not commander format or commander already exists.
 */
export function addCommander(deck: Deck, commander: CardIdentifier): OpResult<CommanderMeta> {
  requireCommanderLikeFormat(deck)

  const isDuplicate = deck.commanders.some(
    c => c.name.toLowerCase() === commander.name.toLowerCase()
  )
  if (isDuplicate) {
    throw new Error(`${commander.name} is already a commander in this deck`)
  }

  const newCommanders = [...deck.commanders, commander]
  const colorIdentity = deriveColorIdentity(newCommanders)

  return {
    deck: { ...deck, commanders: newCommanders, colorIdentity },
    meta: buildMeta(newCommanders),
  }
}

/**
 * Remove a commander from a deck. Recomputes color identity.
 * Throws if not commander format or commander not found.
 */
export function removeCommander(deck: Deck, commanderName: string): OpResult<CommanderMeta> {
  requireCommanderLikeFormat(deck)

  const index = deck.commanders.findIndex(
    c => c.name.toLowerCase() === commanderName.toLowerCase()
  )
  if (index === -1) {
    throw new Error(`${commanderName} is not a commander in this deck`)
  }

  const newCommanders = deck.commanders.filter((_, i) => i !== index)
  const colorIdentity = deriveColorIdentity(newCommanders)

  return {
    deck: { ...deck, commanders: newCommanders, colorIdentity },
    meta: buildMeta(newCommanders),
  }
}

/**
 * Swap one commander for another. Recomputes color identity.
 * Throws if not commander format, old commander not found, or new commander already exists.
 */
export function swapCommander(
  deck: Deck,
  oldName: string,
  newCommander: CardIdentifier
): OpResult<CommanderMeta> {
  requireCommanderLikeFormat(deck)

  const index = deck.commanders.findIndex(
    c => c.name.toLowerCase() === oldName.toLowerCase()
  )
  if (index === -1) {
    throw new Error(`${oldName} is not a commander in this deck`)
  }

  const isDuplicate = deck.commanders.some(
    (c, i) => i !== index && c.name.toLowerCase() === newCommander.name.toLowerCase()
  )
  if (isDuplicate) {
    throw new Error(`${newCommander.name} is already a commander in this deck`)
  }

  const newCommanders = [...deck.commanders]
  newCommanders[index] = newCommander
  const colorIdentity = deriveColorIdentity(newCommanders)

  return {
    deck: { ...deck, commanders: newCommanders, colorIdentity },
    meta: buildMeta(newCommanders),
  }
}

// --- Queries ---

/**
 * Get the effective color identity for a deck.
 * Commander format: uses the stored colorIdentity (derived from commanders).
 * Other formats: computes the union of all non-cut cards' color identities.
 */
export function getDeckColorIdentity(deck: Deck): string[] {
  if (isCommanderLikeFormat(deck.format.type)) {
    return deck.colorIdentity ?? []
  }
  const allCards = [...getMainboard(deck), ...getSideboard(deck)].map(dc => dc.card)
  return deriveColorIdentity(allCards)
}

/**
 * A deck's commanders as one-copy card entries, so views and the Scryfall
 * fetch step can treat them like any other card. Ids are derived from the
 * card name, so they are stable across calls.
 */
export function getCommanderEntries(deck: Deck): CardEntry[] {
  return deck.commanders.map(commander => commanderEntry(commander, deck.createdAt))
}

function commanderEntry(commander: CardIdentifier, addedAt: string): CardEntry {
  return {
    id: `commander-${commander.name}`,
    card: commander,
    quantity: 1,
    ownership: OWNERSHIP_STATUS.UNKNOWN,
    roles: [],
    addedAt,
    source: CARD_SOURCE.USER,
  }
}

/** Colorless is only a meaningful identity for commander-like formats (Commander, Brawl). */
export function showColorlessPip(deck: Deck): boolean {
  return isCommanderLikeFormat(deck.format.type)
}
