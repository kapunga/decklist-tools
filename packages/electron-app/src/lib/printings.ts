import type { ScryfallCard } from '@/types'

/** A printing by scryfall id, among printings grouped by card name. */
export function findPrintingById(
  printingsByName: ReadonlyMap<string, readonly ScryfallCard[]>,
  scryfallId: string,
): ScryfallCard | undefined {
  for (const printings of printingsByName.values()) {
    const match = printings.find(printing => printing.id === scryfallId)
    if (match) return match
  }
  return undefined
}
