import type { Deck, CardIdentifier } from '../types/index.js'
import { FORMAT_TYPE, INCLUSION_STATUS } from '../types/index.js'
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

function requireCommanderFormat(deck: Deck): void {
  if (deck.format.type !== FORMAT_TYPE.COMMANDER) {
    throw new Error('Commanders can only be managed for Commander format decks')
  }
}

// --- Operations ---

/**
 * Add a commander to a deck. Recomputes color identity.
 * Throws if not commander format or commander already exists.
 */
export function addCommander(deck: Deck, commander: CardIdentifier): OpResult<CommanderMeta> {
  requireCommanderFormat(deck)

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
  requireCommanderFormat(deck)

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
  requireCommanderFormat(deck)

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
  if (deck.format.type === FORMAT_TYPE.COMMANDER) {
    return deck.colorIdentity ?? []
  }
  const allCards = [...deck.cards, ...deck.sideboard]
    .filter(dc => dc.inclusion !== INCLUSION_STATUS.CUT)
    .map(dc => dc.card)
  return deriveColorIdentity(allCards)
}

/** Colorless is only a meaningful identity for commander format. */
export function showColorlessPip(deck: Deck): boolean {
  return deck.format.type === FORMAT_TYPE.COMMANDER
}
