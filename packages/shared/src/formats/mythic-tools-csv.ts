import type { Deck } from '../types/index.js'
import type { DeckExportFormat, ParsedCard } from './types.js'

const REQUIRED_COLUMNS = ['Card Name', 'Set Code', 'Collector Number', 'Quantity'] as const

/**
 * Parse a single CSV row into fields, honoring double-quoted values that may
 * contain embedded commas. RFC 4180 minus the quote-doubling escape (Mythic
 * Tools doesn't emit quotes inside fields, so we don't need to handle it).
 */
function splitCsvRow(line: string): string[] {
  const fields: string[] = []
  let buf = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') inQuotes = false
      else buf += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { fields.push(buf); buf = ''; continue }
    buf += ch
  }
  fields.push(buf)
  return fields
}

export const mythicToolsCsvFormat: DeckExportFormat = {
  id: 'mythic-tools-csv',
  name: 'Mythic Tools (CSV)',
  description: 'Mythic Tools collection/list CSV export. Identifies cards by set + collector number; ignores price, condition, and container fields.',
  listOnly: true,

  parse(text: string): ParsedCard[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length === 0) return []

    const header = splitCsvRow(lines[0]).map(h => h.trim())
    if (!REQUIRED_COLUMNS.every(col => header.includes(col))) return []

    const idx = {
      name: header.indexOf('Card Name'),
      setCode: header.indexOf('Set Code'),
      collectorNumber: header.indexOf('Collector Number'),
      quantity: header.indexOf('Quantity'),
    }

    const cards: ParsedCard[] = []
    for (let i = 1; i < lines.length; i++) {
      const row = splitCsvRow(lines[i])
      const name = row[idx.name]?.trim()
      const setCode = row[idx.setCode]?.trim().toLowerCase()
      const collectorNumber = row[idx.collectorNumber]?.trim()
      const qtyRaw = row[idx.quantity]?.trim()
      if (!name || !setCode || !collectorNumber) continue
      const quantity = qtyRaw ? parseInt(qtyRaw, 10) : 1
      if (!Number.isFinite(quantity) || quantity < 1) continue

      cards.push({
        name,
        setCode,
        collectorNumber,
        quantity,
        isSideboard: false,
        isMaybeboard: false,
        isCommander: false,
        roles: [],
      })
    }
    return cards
  },

  render(_deck: Deck): string {
    throw new Error('Mythic Tools CSV is import-only.')
  },
}

/** True if the input text starts with a Mythic Tools CSV header row. */
export function looksLikeMythicToolsCsv(text: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  if (!firstLine.includes(',')) return false
  const header = splitCsvRow(firstLine).map(h => h.trim())
  return REQUIRED_COLUMNS.every(col => header.includes(col))
}
