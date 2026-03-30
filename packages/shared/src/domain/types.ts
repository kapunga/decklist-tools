import type { Deck } from '../types/index.js'

// --- Operation Results ---
// Deck is imported so OpResult carries the concrete type.

export type OpResult<M = Record<string, never>> = { deck: Deck; meta: M }

// --- Card Operation Metadata ---

export type AddCardMeta = { merged: boolean }
export type RemoveCardMeta = { removed: boolean; remainingQty: number }
export type MoveCardMeta = { moved: string[]; merged: string[] }

export type UpdateCardMeta = { updatedFields: string[] }

// --- Commander Operation Metadata ---

export type CommanderMeta = { commanders: string[]; colorIdentity: string[] }

// --- Validation ---

export const ISSUE_CATEGORY = {
  STRUCTURE: 'structure',
  LEGALITY: 'legality',
} as const
export type IssueCategory = typeof ISSUE_CATEGORY[keyof typeof ISSUE_CATEGORY]

export interface ValidationIssue {
  category: IssueCategory
  code: string
  message: string
}

export type Validator<T> = (context: T) => ValidationIssue[]

export const composeValidators = <T>(...validators: Validator<T>[]): Validator<T> =>
  (context) => validators.flatMap(v => v(context))
