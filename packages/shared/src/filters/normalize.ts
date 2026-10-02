import { PRIMARY_TYPES, OWNERSHIP_STATUS } from '../types/index.js'
import type { CardFilter, FilterMode } from './types.js'

// Normalises filters from an untrusted caller (an LLM over MCP) into the strict shape
// `applyFilters` matches against. Lenient on case and numeric strings; strict on anything
// that could never match, so a typo errors loudly instead of silently returning no cards.

export class FilterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FilterError'
  }
}

const FILTER_TYPES: CardFilter['type'][] = ['cmc', 'color', 'card-type', 'role', 'ownership']
const FILTER_MODES: FilterMode[] = ['include', 'exclude']
const COLORS = ['W', 'U', 'B', 'R', 'G', 'C']
const OWNERSHIPS: string[] = Object.values(OWNERSHIP_STATUS)

function invalidValue(type: string, value: unknown, validValues: string): FilterError {
  return new FilterError(`Invalid ${type} filter value ${JSON.stringify(value)}. Valid values: ${validValues}`)
}

// Case-insensitive match against a closed set, returning the canonical spelling.
function matchLegal(type: string, legal: readonly string[], value: unknown): string {
  const found = typeof value === 'string'
    ? legal.find(l => l.toLowerCase() === value.trim().toLowerCase())
    : undefined
  if (found === undefined) throw invalidValue(type, value, legal.join(', '))
  return found
}

function normalizeCmc(value: unknown): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 7) {
    throw invalidValue('cmc', value, 'integers 0-7 (7 means 7+)')
  }
  return n
}

// Roles are user-defined, so there is no closed set to check against.
function normalizeRole(value: unknown): string {
  if (typeof value !== 'string') throw invalidValue('role', value, 'role id strings')
  return value
}

const VALUE_NORMALIZERS: Record<CardFilter['type'], (value: unknown) => string | number> = {
  'cmc': normalizeCmc,
  'color': v => matchLegal('color', COLORS, v),
  'card-type': v => matchLegal('card-type', PRIMARY_TYPES, v),
  'role': normalizeRole,
  'ownership': v => matchLegal('ownership', OWNERSHIPS, v),
}

function normalizeFilter(raw: unknown): CardFilter {
  const { type, mode, values } = (raw ?? {}) as Record<string, unknown>
  if (!FILTER_TYPES.includes(type as CardFilter['type'])) {
    throw new FilterError(`Unknown filter type ${JSON.stringify(type)}. Valid types: ${FILTER_TYPES.join(', ')}`)
  }
  if (!FILTER_MODES.includes(mode as FilterMode)) {
    throw new FilterError(`Invalid filter mode ${JSON.stringify(mode)}. Valid modes: ${FILTER_MODES.join(', ')}`)
  }
  if (!Array.isArray(values)) throw new FilterError(`Filter values must be an array (got ${JSON.stringify(values)})`)
  const normalizer = VALUE_NORMALIZERS[type as CardFilter['type']]
  return { type, mode, values: values.map(normalizer) } as CardFilter
}

export function normalizeFilters(raw: unknown): CardFilter[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) throw new FilterError(`filters must be an array (got ${JSON.stringify(raw)})`)
  return raw.map(normalizeFilter)
}
