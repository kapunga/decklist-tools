import { describe, it, expect } from 'vitest'
import { moxfieldFormat } from './moxfield.js'
import { archidektFormat } from './archidekt.js'
import { mtgoFormat } from './mtgo.js'
import { simpleFormat } from './simple.js'
import { detectFormat } from './index.js'

// ─── Moxfield ──────────────────────────────────────────────────

describe('moxfieldFormat.parse', () => {
  it('parses "1 Counterspell (CMR) 632 *F*" — full form with foil marker', () => {
    const result = moxfieldFormat.parse('1 Counterspell (CMR) 632 *F*')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Counterspell',
      setCode: 'cmr',
      collectorNumber: '632',
      quantity: 1,
      isCommander: false,
      isSideboard: false,
      isMaybeboard: false,
    })
  })

  it('parses "1 Sol Ring" — bare form with no set/collector', () => {
    const result = moxfieldFormat.parse('1 Sol Ring')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'Sol Ring', quantity: 1 })
    expect(result[0].setCode).toBeUndefined()
  })

  it('parses "4x Lightning Bolt (M21) 199" — Nx prefix variant', () => {
    const result = moxfieldFormat.parse('4x Lightning Bolt (M21) 199')
    expect(result[0]).toMatchObject({ name: 'Lightning Bolt', setCode: 'm21', collectorNumber: '199', quantity: 4 })
  })

  it('skips comment lines starting with // or #', () => {
    const text = `// header comment\n# another comment\n1 Sol Ring`
    const result = moxfieldFormat.parse(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Sol Ring')
  })

  it('skips empty lines', () => {
    const text = `1 Sol Ring\n\n\n1 Arcane Signet *F*`
    const result = moxfieldFormat.parse(text)
    expect(result).toHaveLength(2)
  })
})

// ─── Archidekt ─────────────────────────────────────────────────

describe('archidektFormat.parse', () => {
  it('parses basic card line', () => {
    const text = '1x Sol Ring (C21) 263 [Ramp]'
    const result = archidektFormat.parse(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Sol Ring',
      setCode: 'c21',
      collectorNumber: '263',
      quantity: 1,
    })
  })

  it('extracts roles from ^tag^ annotations', () => {
    const text = '1x Sol Ring (C21) 263 [Ramp] ^ramp^ ^mana-rock^'
    const result = archidektFormat.parse(text)
    expect(result[0].roles).toEqual(['ramp', 'mana-rock'])
  })

  it('detects commander category', () => {
    const text = '1x Atraxa (ONE) 226 [Commander]'
    const result = archidektFormat.parse(text)
    expect(result[0].isCommander).toBe(true)
  })

  it('detects sideboard category', () => {
    const text = '1x Swords to Plowshares (STA) 10 [Sideboard]'
    const result = archidektFormat.parse(text)
    expect(result[0].isSideboard).toBe(true)
  })

  it('adds land role for Lands category', () => {
    const text = '1x Command Tower (C21) 284 [Lands]'
    const result = archidektFormat.parse(text)
    expect(result[0].roles).toContain('land')
  })

  it('handles quantity > 1', () => {
    const text = '4x Lightning Bolt (M21) 199 [Other]'
    const result = archidektFormat.parse(text)
    expect(result[0].quantity).toBe(4)
  })

  it('skips non-matching lines', () => {
    const text = `1x Sol Ring (C21) 263 [Ramp]
some random text
another non-card line`

    const result = archidektFormat.parse(text)
    expect(result).toHaveLength(1)
  })
})

// ─── MTGO ──────────────────────────────────────────────────────

describe('mtgoFormat.parse', () => {
  it('parses "4 Lightning Bolt"', () => {
    const result = mtgoFormat.parse('4 Lightning Bolt')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'Lightning Bolt', quantity: 4, isSideboard: false })
  })

  it('treats blank line as sideboard separator', () => {
    const text = `4 Lightning Bolt
2 Counterspell

3 Mystical Dispute`

    const result = mtgoFormat.parse(text)
    expect(result).toHaveLength(3)
    expect(result[0].isSideboard).toBe(false)
    expect(result[1].isSideboard).toBe(false)
    expect(result[2].isSideboard).toBe(true)
  })

  it('treats "Sideboard" label as sideboard marker', () => {
    const text = `4 Lightning Bolt
Sideboard
2 Negate`

    const result = mtgoFormat.parse(text)
    expect(result).toHaveLength(2)
    expect(result[0].isSideboard).toBe(false)
    expect(result[1].isSideboard).toBe(true)
  })

  it('handles empty input', () => {
    expect(mtgoFormat.parse('')).toEqual([])
  })
})

// ─── Simple ────────────────────────────────────────────────────

describe('simpleFormat.parse', () => {
  it('parses "4 Lightning Bolt"', () => {
    const result = simpleFormat.parse('4 Lightning Bolt')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'Lightning Bolt', quantity: 4 })
  })

  it('parses card name with no quantity as qty 1', () => {
    const result = simpleFormat.parse('Sol Ring')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'Sol Ring', quantity: 1 })
  })

  it('handles "Sideboard:" section', () => {
    const text = `4 Lightning Bolt
Sideboard:
2 Negate`

    const result = simpleFormat.parse(text)
    expect(result).toHaveLength(2)
    expect(result[0].isSideboard).toBe(false)
    expect(result[1].isSideboard).toBe(true)
  })

  it('ignores lines containing "deck"', () => {
    const text = `Deck
4 Lightning Bolt`

    const result = simpleFormat.parse(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Lightning Bolt')
  })

  it('handles empty input', () => {
    expect(simpleFormat.parse('')).toEqual([])
  })
})

// ─── detectFormat ──────────────────────────────────────────────

describe('detectFormat', () => {
  it('detects archidekt format', () => {
    const text = '1x Sol Ring (C21) 263 [Ramp] ^ramp^'
    const result = detectFormat(text)
    expect(result.format.id).toBe('archidekt')
    expect(result.confidence).toBe('high')
  })

  it('detects arena format', () => {
    const text = '4 Lightning Bolt (M21) 199'
    const result = detectFormat(text)
    expect(result.format.id).toBe('arena')
    expect(result.confidence).toBe('high')
  })

  it('falls back to simple with low confidence', () => {
    const text = '4 Lightning Bolt'
    const result = detectFormat(text)
    expect(result.format.id).toBe('simple')
    expect(result.confidence).toBe('low')
  })
})
