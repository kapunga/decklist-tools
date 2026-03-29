import type { Deck, ScryfallCard } from '../types/index.js'
import type { ValidationIssue } from './types.js'
import { composeValidators } from './types.js'

export function validateDeckSize(_deck: Deck): ValidationIssue[] {
  throw new Error('Not yet implemented')
}

export function validateSideboardSize(_deck: Deck): ValidationIssue[] {
  throw new Error('Not yet implemented')
}

export function validateCardLimits(_deck: Deck): ValidationIssue[] {
  throw new Error('Not yet implemented')
}

export function validateCommanderPresence(_deck: Deck): ValidationIssue[] {
  throw new Error('Not yet implemented')
}

export function validateFormatLegality(_deck: Deck, _scryfallCache: Map<string, ScryfallCard>): ValidationIssue[] {
  throw new Error('Not yet implemented')
}

export function validateColorIdentity(_deck: Deck): ValidationIssue[] {
  throw new Error('Not yet implemented')
}

export const validateDeckStructure = composeValidators(
  validateDeckSize,
  validateSideboardSize,
  validateCardLimits,
  validateCommanderPresence,
)
