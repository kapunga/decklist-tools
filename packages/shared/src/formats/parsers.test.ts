import { describe, it, expect } from 'vitest'
import { moxfieldFormat } from './moxfield.js'
import { archidektFormat } from './archidekt.js'
import { mtgoFormat } from './mtgo.js'
import { simpleFormat } from './simple.js'
import { detectFormat } from './index.js'

// ─── Moxfield ──────────────────────────────────────────────────

describe('moxfieldFormat.parse', () => {
  it('parses CSV with header', () => {
    const text = `Count,Name,Edition,Collector Number,Foil,Condition,Language,Category
1,Sol Ring,C21,263,,,English,Mainboard
4,Lightning Bolt,M21,199,,,English,Mainboard`

    const result = moxfieldFormat.parse(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: 'Sol Ring', setCode: 'c21', collectorNumber: '263', quantity: 1 })
    expect(result[1]).toMatchObject({ name: 'Lightning Bolt', quantity: 4 })
  })

  it('detects sideboard category', () => {
    const text = `Count,Name,Edition,Collector Number,Foil,Condition,Language,Category
1,Swords to Plowshares,STA,10,,,English,Sideboard`

    const result = moxfieldFormat.parse(text)
    expect(result[0].isSideboard).toBe(true)
  })

  it('detects commander category', () => {
    const text = `Count,Name,Edition,Collector Number,Foil,Condition,Language,Category
1,Atraxa,ONE,226,,,English,Commander`

    const result = moxfieldFormat.parse(text)
    expect(result[0].isCommander).toBe(true)
  })

  it('detects maybeboard and considering categories', () => {
    const text = `Count,Name,Edition,Collector Number,Foil,Condition,Language,Category
1,Card A,SET,1,,,English,Maybeboard
1,Card B,SET,2,,,English,Considering`

    const result = moxfieldFormat.parse(text)
    expect(result[0].isMaybeboard).toBe(true)
    expect(result[1].isMaybeboard).toBe(true)
  })

  it('skips lines with fewer than 4 columns', () => {
    const text = `Count,Name,Edition,Collector Number
1,Sol Ring
complete line,name,set,123`

    const result = moxfieldFormat.parse(text)
    // Only the complete line parses (first data line has only 2 columns)
    expect(result).toHaveLength(1)
  })

  it('skips lines with empty name', () => {
    const text = `Count,Name,Edition,Collector Number
1,,SET,123`

    const result = moxfieldFormat.parse(text)
    expect(result).toHaveLength(0)
  })

  it('handles quoted fields', () => {
    const text = `"Count","Name","Edition","Collector Number"
"1","Sol Ring","C21","263"`

    const result = moxfieldFormat.parse(text)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Sol Ring')
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

  it('detects moxfield CSV format', () => {
    const text = 'Count,Name,Edition,Collector Number\n1,Sol Ring,C21,263'
    const result = detectFormat(text)
    expect(result.format.id).toBe('moxfield')
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
