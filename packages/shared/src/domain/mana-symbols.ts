// Pure mana-cost parsing and pip tallying.
//
// Counting rules (one pip per symbol, never fractional):
//   {W} {U} {B} {R} {G}  one pip of that colour
//   {C}                  one Colorless pip
//   {N}                  N generic mana, kept apart from the pips
//   {W/U}, {C/W}         hybrid: one pip toward each option
//   {W/U/P}              hybrid Phyrexian: same as hybrid
//   {2/W}                twobrid: one pip of its colour, no generic
//   {G/P}                Phyrexian: one pip of its colour
//   {X} {Y} {Z} {S} etc. not counted

export type PipColor = 'W' | 'U' | 'B' | 'R' | 'G'
export type PipKey = PipColor | 'C'

export type ManaSymbol =
  | { kind: 'colored'; color: PipColor }
  | { kind: 'colorless' }
  | { kind: 'generic'; amount: number }
  | { kind: 'hybrid'; options: PipKey[] }
  | { kind: 'twobrid'; color: PipColor }
  | { kind: 'phyrexian'; color: PipColor }
  | { kind: 'variable' }
  | { kind: 'snow' }
  | { kind: 'other'; text: string }

export type ManaPipCounts = Record<PipKey, number>

export interface ManaCostTally {
  pips: ManaPipCounts
  generic: number
}

export const PIP_KEYS: readonly PipKey[] = ['W', 'U', 'B', 'R', 'G', 'C']

export const emptyManaCostTally: ManaCostTally = {
  pips: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
  generic: 0,
}

const isPipColor = (s: string): s is PipColor => ['W', 'U', 'B', 'R', 'G'].includes(s)
const isPipKey = (s: string): s is PipKey => s === 'C' || isPipColor(s)

/** Parse the hybrid / twobrid / Phyrexian forms of a slash symbol. */
function parseSlashSymbol(body: string): ManaSymbol {
  const parts = body.split('/')
  const [first, second] = parts
  if (parts.length === 2 && second === 'P' && isPipColor(first)) return { kind: 'phyrexian', color: first }
  if (parts.length === 2 && first === '2' && isPipColor(second)) return { kind: 'twobrid', color: second }
  const options = parts.filter(p => p !== 'P')
  return options.length >= 2 && options.every(isPipKey)
    ? { kind: 'hybrid', options }
    : { kind: 'other', text: body }
}

/** Classify the body of one `{...}` symbol. */
export function parseManaSymbol(body: string): ManaSymbol {
  if (/^\d+$/.test(body)) return { kind: 'generic', amount: Number(body) }
  if (body === 'C') return { kind: 'colorless' }
  if (isPipColor(body)) return { kind: 'colored', color: body }
  if (body === 'X' || body === 'Y' || body === 'Z') return { kind: 'variable' }
  if (body === 'S') return { kind: 'snow' }
  if (body.includes('/')) return parseSlashSymbol(body)
  return { kind: 'other', text: body }
}

/** Every `{...}` symbol in a mana cost, in order (split costs included). */
export function parseManaCost(manaCost: string): ManaSymbol[] {
  return [...manaCost.matchAll(/\{([^}]+)\}/g)].map(m => parseManaSymbol(m[1]))
}

/** Pip keys a single symbol counts toward. */
function symbolPips(symbol: ManaSymbol): PipKey[] {
  switch (symbol.kind) {
    case 'colored':
    case 'twobrid':
    case 'phyrexian':
      return [symbol.color]
    case 'colorless':
      return ['C']
    case 'hybrid':
      return symbol.options
    default:
      return []
  }
}

function addSymbol(tally: ManaCostTally, symbol: ManaSymbol): ManaCostTally {
  const pips = symbolPips(symbol).reduce(
    (acc, key) => ({ ...acc, [key]: acc[key] + 1 }),
    tally.pips,
  )
  const generic = tally.generic + (symbol.kind === 'generic' ? symbol.amount : 0)
  return { pips, generic }
}

/** Tally pips and generic mana for one parsed cost. */
export function tallyManaCost(symbols: ManaSymbol[]): ManaCostTally {
  return symbols.reduce(addSymbol, emptyManaCostTally)
}

/** Multiply every count in a tally (e.g. by card quantity). */
export function scaleTally(tally: ManaCostTally, factor: number): ManaCostTally {
  const pips = Object.fromEntries(PIP_KEYS.map(k => [k, tally.pips[k] * factor])) as ManaPipCounts
  return { pips, generic: tally.generic * factor }
}

/** Sum two tallies. */
export function addTallies(a: ManaCostTally, b: ManaCostTally): ManaCostTally {
  const pips = Object.fromEntries(PIP_KEYS.map(k => [k, a.pips[k] + b.pips[k]])) as ManaPipCounts
  return { pips, generic: a.generic + b.generic }
}
