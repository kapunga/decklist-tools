const limits = new Map<string, number>()
let loaded = false

export function setDeckLimits(entries: Iterable<readonly [string, number]>): void {
  limits.clear()
  for (const [name, limit] of entries) {
    limits.set(name, limit)
  }
  loaded = true
}

export function getDeckLimit(cardName: string): number | undefined {
  return limits.get(cardName)
}

export function hasDeckLimitsLoaded(): boolean {
  return loaded
}
