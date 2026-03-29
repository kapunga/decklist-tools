export type { ParsedCard, DeckFormat, RenderOptions, DetectedFormat } from './types'

import { arenaFormat } from './arena'
import { moxfieldFormat } from './moxfield'
import { mtgoFormat } from './mtgo'
import { simpleFormat } from './simple'
import { archidektFormat } from './archidekt'
import type { DeckFormat, DetectedFormat } from './types'

// All formats
export const formats: DeckFormat[] = [
  arenaFormat,
  moxfieldFormat,
  archidektFormat,
  mtgoFormat,
  simpleFormat
]

export function getFormat(id: string): DeckFormat | undefined {
  return formats.find(f => f.id === id)
}

export function detectFormat(text: string): DetectedFormat {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  // Archidekt: has [Category] and ^tag^
  if (lines.some(l => l.includes('[') && l.includes(']') && l.includes('x '))) {
    return { format: archidektFormat, confidence: 'high' }
  }

  // Moxfield CSV: starts with header
  if (lines[0]?.toLowerCase().startsWith('count,')) {
    return { format: moxfieldFormat, confidence: 'high' }
  }

  // Arena/Mythic Tools: has set code in parentheses with collector number
  // Handles collector numbers like 123, 81p, 248s
  if (lines.some(l => /\([A-Za-z0-9]+\)\s+\S+/.test(l))) {
    return { format: arenaFormat, confidence: 'high' }
  }

  // Default to simple — no specific format markers detected
  return { format: simpleFormat, confidence: 'low' }
}

// Re-export individual formats for direct access if needed
export { arenaFormat } from './arena'
export { moxfieldFormat } from './moxfield'
export { mtgoFormat } from './mtgo'
export { simpleFormat } from './simple'
export { archidektFormat } from './archidekt'
