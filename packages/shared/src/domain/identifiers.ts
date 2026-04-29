import type { CardIdentifier, ScryfallCard } from '../types/index.js'

export interface CardIdentifierOverrides {
  setCode?: string
  collectorNumber?: string
}

export function createCardIdentifier(
  scryfallCard: ScryfallCard,
  overrides?: CardIdentifierOverrides,
): CardIdentifier {
  return {
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    flavorName: scryfallCard.flavor_name,
    setCode: overrides?.setCode || scryfallCard.set,
    collectorNumber: overrides?.collectorNumber || scryfallCard.collector_number,
    colorIdentity: scryfallCard.color_identity,
  }
}
