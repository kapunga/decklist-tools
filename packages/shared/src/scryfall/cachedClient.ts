import type { Storage } from '../storage/index.js'
import type { ScryfallCard, Deck, PreCacheResult } from '../types/index.js'
import { isDoubleFacedCard } from '../types/index.js'
import {
  searchCardByName,
  searchCardByNameExact,
  getCardBySetAndNumber,
  getCardById,
  getCardFaceImageUrl
} from './index.js'

export class CachedScryfallClient {
  constructor(private storage: Storage) {}

  /**
   * Get a card by name, checking cache first
   */
  async getCardByName(name: string, exact?: boolean): Promise<ScryfallCard | null> {
    // Check cache first
    const cached = this.storage.getCachedCardByName(name)
    if (cached) {
      return cached
    }

    // Fetch from API
    const card = exact
      ? await searchCardByNameExact(name)
      : await searchCardByName(name)

    if (card) {
      this.storage.cacheCardWithIndex(card)
    }

    return card
  }

  /**
   * Get a card by set code and collector number, checking cache first
   */
  async getCardBySetCollector(setCode: string, collectorNumber: string): Promise<ScryfallCard | null> {
    // Check cache first
    const cached = this.storage.getCachedCardBySetCollector(setCode, collectorNumber)
    if (cached) {
      return cached
    }

    // Fetch from API
    const card = await getCardBySetAndNumber(setCode, collectorNumber)

    if (card) {
      this.storage.cacheCardWithIndex(card)
    }

    return card
  }

  /**
   * Get a card by Scryfall ID, checking cache first
   */
  async getCardById(scryfallId: string): Promise<ScryfallCard | null> {
    // Check cache first
    const cached = this.storage.getCachedCard(scryfallId) as ScryfallCard | null
    if (cached) {
      return cached
    }

    // Fetch from API
    const card = await getCardById(scryfallId)

    if (card) {
      this.storage.cacheCardWithIndex(card)
    }

    return card
  }

  /**
   * Cache images for a card (normal size, 488x680px)
   */
  async cacheCardImages(card: ScryfallCard): Promise<void> {
    const isDFC = isDoubleFacedCard(card)

    if (isDFC && card.card_faces) {
      // Cache both faces
      const frontUrl = getCardFaceImageUrl(card, 0, 'normal')
      const backUrl = getCardFaceImageUrl(card, 1, 'normal')

      if (frontUrl && !this.storage.getCachedImagePath(card.id, 'front')) {
        try {
          const response = await fetch(frontUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            this.storage.cacheImage(card.id, buffer, 'front')
          }
        } catch (error) {
          console.error(`Error caching front image for ${card.name}:`, error)
        }
      }

      if (backUrl && !this.storage.getCachedImagePath(card.id, 'back')) {
        try {
          const response = await fetch(backUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            this.storage.cacheImage(card.id, buffer, 'back')
          }
        } catch (error) {
          console.error(`Error caching back image for ${card.name}:`, error)
        }
      }
    } else {
      // Single-faced card
      const imageUrl = getCardFaceImageUrl(card, 0, 'normal')

      if (imageUrl && !this.storage.getCachedImagePath(card.id)) {
        try {
          const response = await fetch(imageUrl)
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer())
            this.storage.cacheImage(card.id, buffer)
          }
        } catch (error) {
          console.error(`Error caching image for ${card.name}:`, error)
        }
      }
    }
  }

  /**
   * Pre-cache all cards (and optionally images) in a deck
   */
  async preCacheDeck(deck: Deck, options: { includeImages?: boolean } = {}): Promise<PreCacheResult> {
    const result: PreCacheResult = {
      success: true,
      cachedCards: 0,
      cachedImages: 0,
      errors: []
    }

    // Collect all cards from the deck
    const allCards = [
      ...deck.cards,
      ...deck.alternates,
      ...deck.sideboard
    ]

    // Also include commanders
    const commanderIdentifiers = deck.commanders || []

    // Process regular deck cards
    for (const deckCard of allCards) {
      try {
        let card: ScryfallCard | null = null

        if (deckCard.card.scryfallId) {
          card = await this.getCardById(deckCard.card.scryfallId)
        } else if (deckCard.card.setCode && deckCard.card.collectorNumber) {
          card = await this.getCardBySetCollector(deckCard.card.setCode, deckCard.card.collectorNumber)
        } else {
          card = await this.getCardByName(deckCard.card.name)
        }

        if (card) {
          result.cachedCards++

          if (options.includeImages) {
            await this.cacheCardImages(card)
            result.cachedImages++
          }
        } else {
          result.errors.push(`Card not found: ${deckCard.card.name}`)
        }
      } catch (error) {
        result.errors.push(`Error caching ${deckCard.card.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Process commanders
    for (const commander of commanderIdentifiers) {
      try {
        let card: ScryfallCard | null = null

        if (commander.scryfallId) {
          card = await this.getCardById(commander.scryfallId)
        } else if (commander.setCode && commander.collectorNumber) {
          card = await this.getCardBySetCollector(commander.setCode, commander.collectorNumber)
        } else {
          card = await this.getCardByName(commander.name)
        }

        if (card) {
          result.cachedCards++

          if (options.includeImages) {
            await this.cacheCardImages(card)
            result.cachedImages++
          }
        } else {
          result.errors.push(`Commander not found: ${commander.name}`)
        }
      } catch (error) {
        result.errors.push(`Error caching commander ${commander.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  }
}
