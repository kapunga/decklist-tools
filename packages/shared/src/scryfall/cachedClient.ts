import type { Storage } from '../storage/index.js'
import type { ScryfallCard } from '../types/index.js'
import {
  searchCardByName,
  searchCardByNameExact,
  getCardBySetAndNumber,
  getCardById,
  lookupCardsByIdentifiers,
} from './index.js'

const sameName = (a: ScryfallCard, b: ScryfallCard): boolean =>
  a.name.toLowerCase() === b.name.toLowerCase()

const firstPerName = (cards: ScryfallCard[]): ScryfallCard[] =>
  cards.filter((card, i) => cards.findIndex(other => sameName(other, card)) === i)

const isCard = (card: ScryfallCard | null): card is ScryfallCard => card !== null

/** Fill the gaps (nulls) in `cached`, in order, from `fetched`. */
const fillMisses = (
  cached: readonly (ScryfallCard | null)[],
  fetched: readonly (ScryfallCard | null)[],
): (ScryfallCard | null)[] => {
  let next = 0
  return cached.map(card => card ?? fetched[next++] ?? null)
}

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
   * Exact-name batch lookup. Names already in the card cache are served from it; only
   * the rest go to Scryfall, batched through POST /cards/collection (75 per request).
   * Fetched cards are cached, so a repeat call makes no request. Returns one entry per
   * input name, in order, with null where Scryfall has no card of that exact name.
   * Rejects (ScryfallError / ScryfallRateLimitError) if a batch request fails.
   */
  async getCardsByNames(names: readonly string[]): Promise<(ScryfallCard | null)[]> {
    const cached = names.map(name => this.storage.getCachedCardByName(name))
    const missing = names.filter((_, i) => !cached[i])
    const fetched = await lookupCardsByIdentifiers(missing.map(name => ({ name })))
    this.rememberCards(fetched.filter(isCard))
    return fillMisses(cached, fetched)
  }

  /**
   * Cache cards seen in search results so later name/id lookups skip the network.
   * A name that already resolves to a cached printing keeps that printing (it may be
   * the one a deck uses), and only the first printing of each name in the batch is kept.
   */
  rememberCards(cards: ScryfallCard[]): void {
    const fresh = firstPerName(cards).filter(card => !this.storage.getCachedCardByName(card.name))
    if (fresh.length > 0) this.storage.cacheCardsWithIndex(fresh)
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
}
