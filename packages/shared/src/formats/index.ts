export type { ParsedCard, DeckExportFormat, RenderOptions } from './types.js'

import { arenaFormat } from './arena.js'
import { moxfieldFormat } from './moxfield.js'
import { mtgoFormat } from './mtgo.js'
import { simpleFormat } from './simple.js'
import { archidektFormat } from './archidekt.js'
import type { DeckExportFormat } from './types.js'

// All formats
export const formats: DeckExportFormat[] = [
  arenaFormat,
  moxfieldFormat,
  archidektFormat,
  mtgoFormat,
  simpleFormat
]

export function getFormat(id: string): DeckExportFormat | undefined {
  return formats.find(f => f.id === id)
}

export function detectFormat(text: string): DeckExportFormat {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  // Archidekt: has [Category] and ^tag^
  if (lines.some(l => l.includes('[') && l.includes(']') && l.includes('x '))) {
    return archidektFormat
  }

  // Moxfield CSV: starts with header
  if (lines[0]?.toLowerCase().startsWith('count,')) {
    return moxfieldFormat
  }

  // Arena/Mythic Tools: has set code in parentheses with collector number
  // Handles collector numbers like 123, 81p, 248s
  if (lines.some(l => /\([A-Za-z0-9]+\)\s+\S+/.test(l))) {
    return arenaFormat
  }

  // Default to simple
  return simpleFormat
}

// Re-export individual formats for direct access if needed
export { arenaFormat } from './arena.js'
export { moxfieldFormat } from './moxfield.js'
export { mtgoFormat } from './mtgo.js'
export { simpleFormat } from './simple.js'
export { archidektFormat } from './archidekt.js'
