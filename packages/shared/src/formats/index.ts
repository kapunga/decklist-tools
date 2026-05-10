export type { ParsedCard, DeckExportFormat, RenderOptions, DetectedFormat } from './types.js'

import { arenaFormat } from './arena.js'
import { moxfieldFormat } from './moxfield.js'
import { mtgoFormat } from './mtgo.js'
import { simpleFormat } from './simple.js'
import { archidektFormat } from './archidekt.js'
import { mythicToolsCsvFormat, looksLikeMythicToolsCsv } from './mythic-tools-csv.js'
import type { DeckExportFormat, DetectedFormat } from './types.js'

// All formats
export const formats: DeckExportFormat[] = [
  arenaFormat,
  moxfieldFormat,
  archidektFormat,
  mtgoFormat,
  simpleFormat,
  mythicToolsCsvFormat,
]

export function getFormat(id: string): DeckExportFormat | undefined {
  return formats.find(f => f.id === id)
}

export function detectFormat(text: string): DetectedFormat {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  // Mythic Tools CSV: detect by header row
  if (looksLikeMythicToolsCsv(text)) {
    return { format: mythicToolsCsvFormat, confidence: 'high' }
  }

  // Archidekt: has [Category] and ^tag^
  if (lines.some(l => l.includes('[') && l.includes(']') && l.includes('x '))) {
    return { format: archidektFormat, confidence: 'high' }
  }

  // Arena/Mythic Tools/Moxfield share the plain-text grammar with set code in
  // parentheses and a collector number. Arena is the most established label
  // and its parser handles the same lines Moxfield emits, so we route there.
  if (lines.some(l => /\([A-Za-z0-9]+\)\s+\S+/.test(l))) {
    return { format: arenaFormat, confidence: 'high' }
  }

  // Default to simple — no specific format markers detected
  return { format: simpleFormat, confidence: 'low' }
}

// Re-export individual formats for direct access if needed
export { arenaFormat } from './arena.js'
export { moxfieldFormat } from './moxfield.js'
export { mtgoFormat } from './mtgo.js'
export { simpleFormat } from './simple.js'
export { archidektFormat } from './archidekt.js'
export { mythicToolsCsvFormat } from './mythic-tools-csv.js'
