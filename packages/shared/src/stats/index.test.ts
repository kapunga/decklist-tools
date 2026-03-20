import { describe, it, expect } from 'vitest'
import { hypergeometricPmf, hypergeometricCdf, buildConsistencyMatrix } from './index.js'

describe('hypergeometricPmf', () => {
  it('returns 1 when drawing 0 successes from a pool with 0 successes', () => {
    // D=60, N=0 successes, draw n=7, want k=0
    expect(hypergeometricPmf(60, 0, 7, 0)).toBeCloseTo(1.0)
  })

  it('returns 0 for impossible draws', () => {
    // Can't draw 5 successes when only 3 exist
    expect(hypergeometricPmf(60, 3, 7, 5)).toBe(0)
    // Can't draw more than we have in deck
    expect(hypergeometricPmf(60, 10, 7, -1)).toBe(0)
  })

  it('returns correct probability for a known case', () => {
    // Classic: 99-card deck, 37 lands, 7-card hand, P(exactly 3 lands)
    // C(37,3) * C(62,4) / C(99,7) ≈ 0.2912
    const p = hypergeometricPmf(99, 37, 7, 3)
    expect(p).toBeCloseTo(0.2912, 3)
  })

  it('sums to 1 across all possible k values', () => {
    const D = 99, N = 10, n = 7
    let total = 0
    for (let k = 0; k <= Math.min(N, n); k++) {
      total += hypergeometricPmf(D, N, n, k)
    }
    expect(total).toBeCloseTo(1.0, 10)
  })

  it('handles large combinatorics without overflow', () => {
    // C(99, 50) would overflow as a regular integer
    const p = hypergeometricPmf(200, 100, 100, 50)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})

describe('hypergeometricCdf', () => {
  it('returns 1 for P(X >= 0)', () => {
    expect(hypergeometricCdf(99, 37, 7, 0)).toBeCloseTo(1.0)
  })

  it('returns correct probability for at-least-1 land', () => {
    // P(X >= 1) = 1 - P(X = 0)
    // P(X = 0) = C(37,0)*C(62,7)/C(99,7)
    const pAtLeast1 = hypergeometricCdf(99, 37, 7, 1)
    const pExactly0 = hypergeometricPmf(99, 37, 7, 0)
    expect(pAtLeast1).toBeCloseTo(1 - pExactly0, 10)
  })

  it('returns near-certainty for common scenarios', () => {
    // 37 lands in 99, draw 17 cards (turn 10): P(>= 4) should be very high
    const p = hypergeometricCdf(99, 37, 17, 4)
    expect(p).toBeGreaterThan(0.94)
  })

  it('returns 0 for impossible thresholds', () => {
    // Can't draw 8 successes from a pool of 5
    expect(hypergeometricCdf(99, 5, 7, 8)).toBeCloseTo(0)
  })
})

describe('buildConsistencyMatrix', () => {
  it('builds a matrix with correct dimensions', () => {
    const data = buildConsistencyMatrix(99, 10, [7, 8, 9], 'at_least')
    // Rows: k=1..7 (min of maxK=7 and roleCount=10), so 7 rows
    expect(data.rowLabels.length).toBe(7)
    // Columns: 3
    expect(data.columnLabels.length).toBe(3)
    expect(data.probabilities.length).toBe(7)
    expect(data.probabilities[0].length).toBe(3)
  })

  it('generates correct column labels', () => {
    const data = buildConsistencyMatrix(99, 10, [7, 8, 9, 10])
    expect(data.columnLabels).toEqual(['Open', 'T1', 'T2', 'T3'])
  })

  it('generates correct row labels for at_least mode', () => {
    const data = buildConsistencyMatrix(99, 3, [7], 'at_least')
    expect(data.rowLabels).toEqual(['≥1', '≥2', '≥3'])
  })

  it('generates correct row labels for exact mode', () => {
    const data = buildConsistencyMatrix(99, 3, [7], 'exact')
    expect(data.rowLabels).toEqual(['=1', '=2', '=3'])
  })

  it('caps rows at roleCount', () => {
    const data = buildConsistencyMatrix(99, 2, [7])
    // Only 2 cards with this role, so maxK is capped at 2
    expect(data.rowLabels.length).toBe(2)
  })

  it('probabilities decrease as k increases (at_least mode)', () => {
    const data = buildConsistencyMatrix(99, 10, [7], 'at_least')
    // P(>= 1) > P(>= 2) > P(>= 3) ...
    for (let row = 1; row < data.probabilities.length; row++) {
      expect(data.probabilities[row][0]).toBeLessThanOrEqual(
        data.probabilities[row - 1][0]
      )
    }
  })

  it('probabilities increase as cards seen increases (at_least mode, k >= 1)', () => {
    const data = buildConsistencyMatrix(99, 10, [7, 8, 9, 10, 11], 'at_least')
    // For any row (k >= 1), seeing more cards should give higher probability
    for (let col = 1; col < data.probabilities[0].length; col++) {
      expect(data.probabilities[0][col]).toBeGreaterThanOrEqual(
        data.probabilities[0][col - 1]
      )
    }
  })

  it('handles zero roleCount gracefully', () => {
    const data = buildConsistencyMatrix(99, 0, [7, 8, 9])
    // maxK = min(7, 0) = 0, no rows starting from k=1
    expect(data.rowLabels.length).toBe(0)
    expect(data.probabilities.length).toBe(0)
  })

  it('exact mode probabilities sum to <= 1 for each column', () => {
    const data = buildConsistencyMatrix(99, 8, [7, 8, 9], 'exact')
    for (let col = 0; col < data.cardsSeen.length; col++) {
      let sum = 0
      for (let row = 0; row < data.probabilities.length; row++) {
        sum += data.probabilities[row][col]
      }
      // These are k=1..N, not k=0..N, so sum should be <= 1
      expect(sum).toBeLessThanOrEqual(1.001) // small tolerance
    }
  })
})
