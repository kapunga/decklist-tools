import { describe, it, expect } from 'vitest'
import { arenaFormat } from './arena.js'

describe('arenaFormat.parse', () => {
  it('parses "4 Lightning Bolt (M21) 199"', () => {
    const result = arenaFormat.parse('4 Lightning Bolt (M21) 199')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Lightning Bolt',
      setCode: 'm21',
      collectorNumber: '199',
      quantity: 4,
      isSideboard: false,
      isMaybeboard: false,
      isCommander: false,
      roles: [],
    })
  })

  it('handles "1x Sol Ring (C21) 123" prefix', () => {
    const result = arenaFormat.parse('1x Sol Ring (C21) 123')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Sol Ring',
      setCode: 'c21',
      collectorNumber: '123',
      quantity: 1,
      isSideboard: false,
      isMaybeboard: false,
      isCommander: false,
      roles: [],
    })
  })

  it('handles trailing markers like "81p *F*"', () => {
    const result = arenaFormat.parse('1 Flooded Strand (MH3) 81p *F*')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Flooded Strand',
      setCode: 'mh3',
      collectorNumber: '81p',
      quantity: 1,
      isSideboard: false,
      isMaybeboard: false,
      isCommander: false,
      roles: [],
    })
  })

  it('handles collector numbers with letters like 248s', () => {
    const result = arenaFormat.parse('2 Forest (MKM) 248s')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Forest',
      setCode: 'mkm',
      collectorNumber: '248s',
      quantity: 2,
      isSideboard: false,
      isMaybeboard: false,
      isCommander: false,
      roles: [],
    })
  })

  it('parses Commander section', () => {
    const text = `Commander
1 Atraxa, Praetors' Voice (2X2) 190

Deck
4 Forest (MKM) 248`

    const result = arenaFormat.parse(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      name: "Atraxa, Praetors' Voice",
      isCommander: true,
      isSideboard: false,
    })
    expect(result[1]).toMatchObject({
      name: 'Forest',
      isCommander: false,
      isSideboard: false,
    })
  })

  it('parses Sideboard section', () => {
    const text = `Deck
4 Lightning Bolt (M21) 199

Sideboard
2 Pyroblast (EMA) 142`

    const result = arenaFormat.parse(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      name: 'Lightning Bolt',
      isSideboard: false,
    })
    expect(result[1]).toMatchObject({
      name: 'Pyroblast',
      isSideboard: true,
    })
  })

  it('parses Maybeboard/Considering section', () => {
    const text = `Deck
4 Lightning Bolt (M21) 199

Maybeboard
2 Chain Lightning (BBR) 1`

    const result = arenaFormat.parse(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      name: 'Lightning Bolt',
      isMaybeboard: false,
    })
    expect(result[1]).toMatchObject({
      name: 'Chain Lightning',
      isMaybeboard: true,
    })
  })

  it('parses simple format without set info', () => {
    const result = arenaFormat.parse('4 Lightning Bolt')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Lightning Bolt',
      quantity: 4,
      isSideboard: false,
      isMaybeboard: false,
      isCommander: false,
      roles: [],
    })
  })

  it('handles multiple cards', () => {
    const text = `4 Lightning Bolt (M21) 199
3 Counterspell (MH2) 267
2 Path to Exile (2XM) 25`

    const result = arenaFormat.parse(text)
    expect(result).toHaveLength(3)
    expect(result[0].name).toBe('Lightning Bolt')
    expect(result[1].name).toBe('Counterspell')
    expect(result[2].name).toBe('Path to Exile')
  })

  it('handles empty lines and whitespace', () => {
    const text = `
4 Lightning Bolt (M21) 199

3 Counterspell (MH2) 267
    `

    const result = arenaFormat.parse(text)
    expect(result).toHaveLength(2)
  })

  it('ignores invalid lines', () => {
    const text = `4 Lightning Bolt (M21) 199
This is not a card line
3 Counterspell (MH2) 267`

    const result = arenaFormat.parse(text)
    expect(result).toHaveLength(2)
  })
})

describe('arenaFormat metadata', () => {
  it('has correct id and name', () => {
    expect(arenaFormat.id).toBe('arena')
    expect(arenaFormat.name).toBe('MTG Arena / Mythic Tools')
  })
})
