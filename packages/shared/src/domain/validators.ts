import type { Deck, ScryfallCard } from '../types/index.js'
import { FORMAT_TYPE, getCardLimit, getCardCount, isCommanderLikeFormat } from '../types/index.js'
import { isLegalInFormat } from '../scryfall/index.js'
import { getSideboard, getNonCutEntries } from './card-sets.js'
import type { ValidationIssue } from './types.js'
import { ISSUE_CATEGORY, composeValidators } from './types.js'

/**
 * Validate deck size against format requirements.
 * Commander-like (Commander, Brawl): must be exactly deckSize. Others: at least deckSize.
 */
export function validateDeckSize(deck: Deck): ValidationIssue[] {
  const cardCount = getCardCount(deck)
  const format = deck.format

  if (cardCount < format.deckSize) {
    return [{
      category: ISSUE_CATEGORY.STRUCTURE,
      code: 'deck_undersize',
      message: `Deck has ${cardCount} cards, needs ${format.deckSize}`,
    }]
  }

  if (cardCount > format.deckSize && isCommanderLikeFormat(format.type)) {
    return [{
      category: ISSUE_CATEGORY.STRUCTURE,
      code: 'deck_oversize',
      message: `${format.type} deck has ${cardCount} cards, should be exactly ${format.deckSize}`,
    }]
  }

  return []
}

/**
 * Validate sideboard doesn't exceed format limit.
 */
export function validateSideboardSize(deck: Deck): ValidationIssue[] {
  const sideboardCount = getSideboard(deck).reduce((sum, c) => sum + c.quantity, 0)

  if (sideboardCount > deck.format.sideboardSize) {
    return [{
      category: ISSUE_CATEGORY.STRUCTURE,
      code: 'sideboard_oversize',
      message: `Sideboard has ${sideboardCount} cards, max is ${deck.format.sideboardSize}`,
    }]
  }

  return []
}

/**
 * Validate per-card quantity limits across all lists.
 * Respects unlimited cards and special limits (e.g., Seven Dwarves: 7).
 */
export function validateCardLimits(deck: Deck): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const cardCounts = new Map<string, number>()

  // Aggregate quantities across all playable card sets (exclude cut)
  for (const card of getNonCutEntries(deck)) {
    const current = cardCounts.get(card.card.name) || 0
    cardCounts.set(card.card.name, current + card.quantity)
  }

  for (const [name, count] of cardCounts) {
    const limit = getCardLimit(name, deck.format)
    if (count > limit && limit !== Infinity) {
      issues.push({
        category: ISSUE_CATEGORY.STRUCTURE,
        code: 'card_limit_exceeded',
        message: `${name}: ${count} copies (limit: ${limit})`,
      })
    }
  }

  return issues
}

/**
 * Validate that a commander-like format deck has at least one commander.
 */
export function validateCommanderPresence(deck: Deck): ValidationIssue[] {
  if (isCommanderLikeFormat(deck.format.type) && deck.commanders.length === 0) {
    return [{
      category: ISSUE_CATEGORY.STRUCTURE,
      code: 'no_commander',
      message: `No commander set for ${deck.format.type} format deck`,
    }]
  }

  return []
}

/**
 * Validate that all cards are legal in the deck's format.
 * Requires Scryfall data for legality information.
 * Skips kitchen_table format (no restrictions).
 */
export function validateFormatLegality(deck: Deck, scryfallCache: Map<string, ScryfallCard>): ValidationIssue[] {
  if (deck.format.type === FORMAT_TYPE.KITCHEN_TABLE) return []

  const issues: ValidationIssue[] = []

  for (const card of getNonCutEntries(deck)) {
    const scryfallCard = card.card.scryfallId ? scryfallCache.get(card.card.scryfallId) : undefined
    if (!scryfallCard) continue

    if (!isLegalInFormat(scryfallCard, deck.format.type)) {
      issues.push({
        category: ISSUE_CATEGORY.LEGALITY,
        code: 'not_legal_in_format',
        message: `${card.card.name} is not legal in ${deck.format.type}`,
      })
    }
  }

  return issues
}

/**
 * Validate color identity for commander-like format decks (Commander, Brawl).
 * Uses the colorIdentity stored on each CardIdentifier — no Scryfall lookup needed.
 * Skips cards without stored colorIdentity (pre-migration cards).
 */
export function validateColorIdentity(deck: Deck): ValidationIssue[] {
  if (!isCommanderLikeFormat(deck.format.type)) return []
  if (!deck.colorIdentity || deck.colorIdentity.length === 0) return []

  const issues: ValidationIssue[] = []
  const allowed = new Set(deck.colorIdentity)

  for (const card of getNonCutEntries(deck)) {
    if (!card.card.colorIdentity) continue

    const violates = card.card.colorIdentity.some(c => !allowed.has(c))
    if (violates) {
      const cardColors = card.card.colorIdentity.join('') || 'Colorless'
      const deckColors = deck.colorIdentity.join('') || 'Colorless'
      issues.push({
        category: ISSUE_CATEGORY.LEGALITY,
        code: 'color_identity_violation',
        message: `${card.card.name} (${cardColors}) is outside deck's color identity (${deckColors})`,
      })
    }
  }

  return issues
}

/** Composed validator for structural issues (no external data needed). */
export const validateDeckStructure = composeValidators(
  validateDeckSize,
  validateSideboardSize,
  validateCardLimits,
  validateCommanderPresence,
)
