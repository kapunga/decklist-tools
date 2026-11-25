import { getCardPrices, type CardPrices } from '@mtg-deckbuilder/shared'
import type { ScryfallCard } from '@/types'

interface PricedItem {
  cardName: string
  scryfallId?: string
}

/** A stable primitive for the set of cards on the buy list: sorted, de-duplicated ids. */
export function buyListIdsKey(items: readonly Pick<PricedItem, 'scryfallId'>[]): string {
  return [...new Set(items.flatMap(item => (item.scryfallId ? [item.scryfallId] : [])))].sort().join(',')
}

/** Prices for each buy-list item whose card came back, keyed by lower-cased card name. */
export function pricesByCardName(
  items: readonly PricedItem[],
  cards: readonly ScryfallCard[],
): Record<string, CardPrices> {
  const byId = new Map(cards.map(card => [card.id, card]))
  return Object.fromEntries(
    items.flatMap(item => {
      const card = item.scryfallId ? byId.get(item.scryfallId) : undefined
      return card ? [[item.cardName.toLowerCase(), getCardPrices(card)]] : []
    }),
  )
}
