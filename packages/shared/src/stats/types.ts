export type ConsistencyMode = 'at_least' | 'exact'

export interface ConsistencyMatrixData {
  /** Column labels (e.g., "Open", "T1", "T2", ...) */
  columnLabels: string[]
  /** Number of cards seen for each column */
  cardsSeen: number[]
  /** Row labels (e.g., "≥0", "≥1", ... or "=0", "=1", ...) */
  rowLabels: string[]
  /** k value for each row */
  kValues: number[]
  /** probabilities[row][col] — each value in [0, 1] */
  probabilities: number[][]
}
