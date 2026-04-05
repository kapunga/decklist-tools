/**
 * Hypergeometric distribution utilities for MTG deck consistency analysis.
 *
 * Models the probability of drawing N copies of a role/category
 * after seeing M cards from a deck (drawing without replacement).
 */

// Pre-computed log-factorial lookup table for 0..200
// Using log-space avoids overflow when computing C(99, 50) etc.
const LOG_FACT = new Float64Array(201)
for (let i = 1; i <= 200; i++) {
  LOG_FACT[i] = LOG_FACT[i - 1] + Math.log(i)
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity
  return LOG_FACT[n] - LOG_FACT[k] - LOG_FACT[n - k]
}

/**
 * Hypergeometric PMF: P(X = k)
 *
 * @param D - Total deck size (population)
 * @param N - Number of "successes" in deck (cards with the role)
 * @param n - Number of cards drawn (sample size)
 * @param k - Exact number of successes drawn
 */
export function hypergeometricPmf(D: number, N: number, n: number, k: number): number {
  if (k < 0 || k > Math.min(N, n) || (n - k) > (D - N)) return 0
  const logP = logChoose(N, k) + logChoose(D - N, n - k) - logChoose(D, n)
  return Math.exp(logP)
}

/**
 * Hypergeometric CDF (at least): P(X >= k)
 *
 * Computed as 1 - Σ P(X=i) for i=0..k-1
 *
 * @param D - Total deck size
 * @param N - Number of successes in deck
 * @param n - Number of cards drawn
 * @param k - Minimum number of successes
 */
export function hypergeometricCdf(D: number, N: number, n: number, k: number): number {
  if (k <= 0) return 1
  let cumulative = 0
  for (let i = 0; i < k; i++) {
    cumulative += hypergeometricPmf(D, N, n, i)
  }
  return Math.max(0, Math.min(1, 1 - cumulative))
}

import type { ConsistencyMode, ConsistencyMatrixData } from './types.js'
export type { ConsistencyMode, ConsistencyMatrixData } from './types.js'

/**
 * Build a full consistency matrix for a given role count.
 *
 * @param deckSize - Effective deck size (e.g., 99 for Commander)
 * @param roleCount - Number of cards with this role
 * @param cardsSeenRange - Array of cards-seen values (e.g., [7, 8, 9, ..., 17])
 * @param mode - "at_least" for P(X >= k), "exact" for P(X = k)
 * @param maxK - Maximum k value to compute (default: min(roleCount, 7))
 */
export function buildConsistencyMatrix(
  deckSize: number,
  roleCount: number,
  cardsSeenRange: number[],
  mode: ConsistencyMode = 'at_least',
  maxK?: number
): ConsistencyMatrixData {
  const effectiveMaxK = Math.min(maxK ?? 7, roleCount)

  const columnLabels = cardsSeenRange.map((_n, i) => {
    if (i === 0) return 'Open'
    return `T${i}`
  })

  const kValues: number[] = []
  const rowLabels: string[] = []
  for (let k = 1; k <= effectiveMaxK; k++) {
    kValues.push(k)
    rowLabels.push(mode === 'at_least' ? `≥${k}` : `=${k}`)
  }

  const probabilities: number[][] = []
  for (const k of kValues) {
    const row: number[] = []
    for (const n of cardsSeenRange) {
      const p = mode === 'at_least'
        ? hypergeometricCdf(deckSize, roleCount, n, k)
        : hypergeometricPmf(deckSize, roleCount, n, k)
      row.push(p)
    }
    probabilities.push(row)
  }

  return {
    columnLabels,
    cardsSeen: cardsSeenRange,
    rowLabels,
    kValues,
    probabilities,
  }
}
