import {
  Storage,
  type Deck,
  type CardIdentifier,
  type ScryfallCard,
  searchCardByName,
  getCardBySetAndNumber,
} from '@mtg-deckbuilder/shared'

export interface ParsedCardString {
  quantity: number
  setCode: string
  collectorNumber: string
}

/**
 * Parse a card string in the format "[Nx ]<set_code> <collector_number>"
 * Examples: "fdn 542" -> qty 1, set fdn, collector 542
 *           "2x woe 138" -> qty 2, set woe, collector 138
 */
export function parseCardString(card: string): ParsedCardString {
  const trimmed = card.trim()
  const match = trimmed.match(/^(?:(\d+)x\s+)?(\S+)\s+(\S+)$/i)
  if (!match) throw new Error(`Invalid card string format: "${card}". Expected "[Nx ]<set_code> <collector_number>"`)
  return {
    quantity: match[1] ? parseInt(match[1], 10) : 1,
    setCode: match[2],
    collectorNumber: match[3],
  }
}

export function getDeckOrThrow(storage: Storage, deckId: string): Deck {
  const deck = storage.getDeck(deckId)
  if (!deck) throw new Error(`Deck not found: ${deckId}`)
  return deck
}

export async function fetchScryfallCard(
  name: string,
  setCode?: string,
  collectorNumber?: string
): Promise<ScryfallCard> {
  let scryfallCard
  if (setCode && collectorNumber) {
    scryfallCard = await getCardBySetAndNumber(setCode, collectorNumber)
  } else {
    scryfallCard = await searchCardByName(name)
  }
  if (!scryfallCard) throw new Error(`Card not found: ${name}`)
  return scryfallCard
}

export function createCardIdentifier(scryfallCard: ScryfallCard): CardIdentifier {
  return {
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    setCode: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
  }
}

export function findCardInList<T extends { card: { name: string } }>(
  list: T[],
  name: string
): T | undefined {
  return list.find(c => c.card.name.toLowerCase() === name.toLowerCase())
}

export function findCardIndexInList<T extends { card: { name: string } }>(
  list: T[],
  name: string
): number {
  return list.findIndex(c => c.card.name.toLowerCase() === name.toLowerCase())
}
