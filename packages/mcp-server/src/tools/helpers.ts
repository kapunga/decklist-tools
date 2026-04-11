import {
  Storage,
  type Deck,
  type CardIdentifier,
  type ScryfallCard,
  CachedScryfallClient,
} from '@mtg-deckbuilder/shared'

// Input length limits for tool arguments
const INPUT_LIMITS = {
  name: 200,
  description: 2000,
  notes: 10000,
  content: 10000,
  title: 200,
  query: 500,
  source: 500,
  card_name: 200,
  commander_name: 200,
  new_commander_name: 200,
  archetype: 200,
} as const

/**
 * Validate that string arguments don't exceed reasonable length limits.
 * Throws on the first field that exceeds its limit.
 */
export function validateInputLengths(args: Record<string, unknown>): void {
  for (const [key, maxLength] of Object.entries(INPUT_LIMITS)) {
    const value = args[key]
    if (typeof value === 'string' && value.length > maxLength) {
      throw new Error(`'${key}' exceeds maximum length of ${maxLength} characters (got ${value.length})`)
    }
  }

  // Validate card arrays — each entry should be short
  const cards = args.cards
  if (Array.isArray(cards)) {
    for (const card of cards) {
      if (typeof card === 'string' && card.length > 200) {
        throw new Error(`Card string exceeds maximum length of 200 characters`)
      }
    }
  }
}

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

// Singleton cached client instance
let cachedClient: CachedScryfallClient | null = null

export function getCachedScryfallClient(storage: Storage): CachedScryfallClient {
  if (!cachedClient) {
    cachedClient = new CachedScryfallClient(storage)
  }
  return cachedClient
}

/** Reset the singleton client — used in tests to ensure a fresh mock per test. */
export function resetCachedScryfallClient(): void {
  cachedClient = null
}

/**
 * Collect every name variant the supplied `name` is allowed to match against
 * a resolved Scryfall card: canonical name, flavor name, and any face name or
 * face flavor name (DFCs, MDFCs, adventures, sagas).
 */
function collectCardNameVariants(card: ScryfallCard): string[] {
  const variants: string[] = [card.name]
  if (card.flavor_name) variants.push(card.flavor_name)
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (face.name) variants.push(face.name)
      // `flavor_name` isn't on the face type today but some Scryfall payloads
      // do include it — read defensively in case the type evolves.
      const faceFlavor = (face as { flavor_name?: string }).flavor_name
      if (faceFlavor) variants.push(faceFlavor)
    }
  }
  return variants
}

function cardMatchesName(card: ScryfallCard, name: string): boolean {
  const target = name.trim().toLowerCase()
  return collectCardNameVariants(card).some(v => v.toLowerCase() === target)
}

export async function fetchScryfallCard(
  storage: Storage,
  name: string,
  setCode?: string,
  collectorNumber?: string,
  options: { force?: boolean } = {},
): Promise<ScryfallCard> {
  const client = getCachedScryfallClient(storage)
  const scryfallCard = setCode && collectorNumber
    ? await client.getCardBySetCollector(setCode, collectorNumber)
    : await client.getCardByName(name)

  if (!scryfallCard) throw new Error(`Card not found: ${name}`)

  // Cross-check name against the resolved printing when all three identifiers
  // were supplied. Set+collector takes precedence for lookup, but a mismatched
  // `name` is a footgun — it's easy for LLM callers to hallucinate a set+collector
  // that resolves to a different card. Skip when `force` is set, either because
  // the user explicitly overrode the check or because the caller knows `name`
  // isn't a real card name (e.g. a parsed "Nx set collector" string).
  if (!options.force && setCode && collectorNumber && name && !cardMatchesName(scryfallCard, name)) {
    const flavor = scryfallCard.flavor_name ? ` ("${scryfallCard.flavor_name}")` : ''
    throw new Error(
      `Name mismatch: resolved "${scryfallCard.name}"${flavor} from ${scryfallCard.set.toUpperCase()} #${scryfallCard.collector_number}, but the supplied name was "${name}". Pass force: true to override.`
    )
  }

  return scryfallCard
}

export function createCardIdentifier(scryfallCard: ScryfallCard): CardIdentifier {
  return {
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    flavorName: scryfallCard.flavor_name,
    setCode: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
    colorIdentity: scryfallCard.color_identity,
  }
}

