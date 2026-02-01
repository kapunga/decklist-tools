import {
  Storage,
  type Deck,
  type CardIdentifier,
  type ScryfallCard,
  searchCardByName,
  getCardBySetAndNumber,
} from '@mtg-deckbuilder/shared'

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
