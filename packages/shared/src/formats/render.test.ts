import { describe, it, expect } from 'vitest'
import { createEmptyDeck, CARD_SET, type Deck, type CardEntry, type CardIdentifier } from '../types/index.js'
import { makeCardEntry } from '../domain/cards.js'
import { arenaFormat } from './arena.js'
import { moxfieldFormat } from './moxfield.js'
import { archidektFormat } from './archidekt.js'
import { mtgoFormat } from './mtgo.js'
import { simpleFormat } from './simple.js'

function id(name: string, setCode: string, collectorNumber: string): CardIdentifier {
  return { scryfallId: `id-${name}`, name, setCode, collectorNumber }
}

function entry(name: string, quantity: number, opts: { setCode?: string; collectorNumber?: string; roles?: string[] } = {}): CardEntry {
  return makeCardEntry({
    card: id(name, opts.setCode ?? 'tst', opts.collectorNumber ?? '1'),
    quantity,
    roles: opts.roles ?? [],
  })
}

function buildFixture(): Deck {
  const deck = createEmptyDeck('Render Fixture', 'commander')
  deck.commanders = [id('Atraxa, Praetors\' Voice', 'cmr', '270')]

  const mainboard = deck.cardSets.find(s => s.name === CARD_SET.MAINBOARD)!
  mainboard.entries = [
    entry('Sol Ring', 1, { setCode: 'cmr', collectorNumber: '472', roles: ['ramp'] }),
    entry('Lightning Bolt', 4, { setCode: 'm21', collectorNumber: '199', roles: ['removal'] }),
  ]

  const sideboard = deck.cardSets.find(s => s.name === CARD_SET.SIDEBOARD)!
  sideboard.entries = [
    entry('Dispel', 2, { setCode: 'rtr', collectorNumber: '38' }),
  ]

  // Maybeboard rides on the alternates set in the data model.
  const alternates = deck.cardSets.find(s => s.name === CARD_SET.ALTERNATES)!
  alternates.entries = [
    entry('Demonic Tutor', 1, { setCode: '2xm', collectorNumber: '95' }),
  ]

  return deck
}

describe('arenaFormat.render', () => {
  it('renders commander, mainboard, and sideboard with set codes uppercase', () => {
    const out = arenaFormat.render(buildFixture(), { includeSideboard: true })
    expect(out).toContain('Commander')
    expect(out).toContain('1 Atraxa, Praetors\' Voice (CMR) 270')
    expect(out).toContain('Deck')
    expect(out).toContain('1 Sol Ring (CMR) 472')
    expect(out).toContain('4 Lightning Bolt (M21) 199')
    expect(out).toContain('Sideboard')
    expect(out).toContain('2 Dispel (RTR) 38')
  })

  it('omits sideboard when includeSideboard is false', () => {
    const out = arenaFormat.render(buildFixture(), { includeSideboard: false })
    expect(out).not.toContain('Sideboard')
    expect(out).not.toContain('Dispel')
  })

  it('includes maybeboard only when requested', () => {
    const without = arenaFormat.render(buildFixture(), { includeSideboard: true, includeMaybeboard: false })
    expect(without).not.toContain('Maybeboard')
    const withMb = arenaFormat.render(buildFixture(), { includeSideboard: true, includeMaybeboard: true })
    expect(withMb).toContain('Maybeboard')
    expect(withMb).toContain('1 Demonic Tutor (2XM) 95')
  })
})

describe('moxfieldFormat.render', () => {
  it('emits Moxfield\'s plain-text grammar — no CSV, no section headers', () => {
    const out = moxfieldFormat.render(buildFixture(), { includeSideboard: true, includeMaybeboard: true })
    // Documented grammar: AMOUNT CARDNAME (SETCODE) NUMBER
    expect(out).toContain('1 Atraxa, Praetors\' Voice (CMR) 270')
    expect(out).toContain('1 Sol Ring (CMR) 472')
    expect(out).toContain('4 Lightning Bolt (M21) 199')
    // No CSV header — that's the collection format, not the deck format.
    expect(out).not.toContain('Count,Name,Edition')
    // No section headers — Moxfield doesn't accept them in the documented grammar.
    expect(out).not.toMatch(/^(Commander|Mainboard|Sideboard|Maybeboard):?$/m)
  })

  it('emits commanders + mainboard only when section: mainboard', () => {
    const out = moxfieldFormat.render(buildFixture(), { section: 'mainboard' })
    expect(out).toContain('1 Atraxa, Praetors\' Voice (CMR) 270')
    expect(out).toContain('4 Lightning Bolt (M21) 199')
    expect(out).not.toContain('Dispel')
    expect(out).not.toContain('Demonic Tutor')
  })

  it('emits sideboard only when section: sideboard', () => {
    const out = moxfieldFormat.render(buildFixture(), { section: 'sideboard' })
    expect(out).toContain('2 Dispel (RTR) 38')
    expect(out).not.toContain('Atraxa')
    expect(out).not.toContain('Lightning Bolt')
    expect(out).not.toContain('Demonic Tutor')
  })

  it('emits maybeboard only when section: maybeboard', () => {
    const out = moxfieldFormat.render(buildFixture(), { section: 'maybeboard' })
    expect(out).toContain('1 Demonic Tutor (2XM) 95')
    expect(out).not.toContain('Atraxa')
    expect(out).not.toContain('Lightning Bolt')
    expect(out).not.toContain('Dispel')
  })
})

describe('archidektFormat.render', () => {
  it('emits structural brackets only — no role tags, no [Category]', () => {
    const out = archidektFormat.render(buildFixture(), { includeSideboard: true, includeMaybeboard: true })
    expect(out).toContain('1x Atraxa, Praetors\' Voice (CMR) 270 [Commander]')
    expect(out).toContain('1x Sol Ring (CMR) 472')
    expect(out).toContain('4x Lightning Bolt (M21) 199')
    expect(out).toContain('2x Dispel (RTR) 38 [Sideboard]')
    expect(out).toContain('1x Demonic Tutor (2XM) 95 [Maybeboard]')
    // No role tags should be present — Archidekt's tag parser is fragile and
    // their own native exports omit tags.
    expect(out).not.toContain('^')
    // No fall-through `[Other]` bracket on mainboard rows.
    expect(out).not.toContain('[Other]')
  })

  it('parser still handles legacy tagged output', () => {
    // Older exports (and other tools) may emit `^role,#color^` tags. The
    // parser must remain forgiving even though the renderer no longer emits.
    const legacy = '4x Lightning Bolt (M21) 199 ^removal,#ef4444^'
    const parsed = archidektFormat.parse(legacy)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].roles).toEqual(['removal'])
  })
})

describe('mtgoFormat.render', () => {
  it('renders plain "N Name" lines with sideboard separator', () => {
    const out = mtgoFormat.render(buildFixture(), { includeSideboard: true })
    expect(out).toContain('Commander')
    expect(out).toContain('1 Atraxa, Praetors\' Voice')
    expect(out).toContain('1 Sol Ring')
    expect(out).toContain('4 Lightning Bolt')
    expect(out).toContain('Sideboard')
    expect(out).toContain('2 Dispel')
    expect(out).not.toMatch(/\(.*\)/)
  })
})

describe('simpleFormat.render', () => {
  it('renders bare counts and names, no set info', () => {
    const out = simpleFormat.render(buildFixture(), { includeSideboard: true })
    expect(out).toContain('Commander:')
    expect(out).toContain('1 Atraxa, Praetors\' Voice')
    expect(out).toContain('4 Lightning Bolt')
    expect(out).toContain('Sideboard:')
    expect(out).toContain('2 Dispel')
    expect(out).not.toMatch(/\(.*\)/)
  })

  it('skips Commander section for non-commander format', () => {
    const deck = createEmptyDeck('Modern Burn', 'modern')
    const mb = deck.cardSets.find(s => s.name === CARD_SET.MAINBOARD)!
    mb.entries = [entry('Lightning Bolt', 4)]
    const out = simpleFormat.render(deck, { includeSideboard: false })
    expect(out).not.toContain('Commander')
    expect(out).toContain('4 Lightning Bolt')
  })
})
