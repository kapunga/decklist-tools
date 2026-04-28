import {
  Storage,
  type OwnershipStatus,
  type ScryfallCard,
  type SearchResult,
  type CardSetName,
  searchCardByNameExact,
  searchCardByName,
  getCardBySetAndNumber,
  getCardById,
  searchCards,
  getOracleText,
  CARD_SET,
  addCardToDeck,
  removeCardFromDeck,
  moveCard,
  updateCardInDeck,
  findCardAcrossLists,
  makeCardEntry,
  getPrimaryType,
} from '@mtg-deckbuilder/shared'
import { getDeckOrThrow, fetchScryfallCard, createCardIdentifier, parseCardString } from './helpers.js'
import type { ManageCardArgs, SearchCardsArgs } from './types.js'

// Scryfall operator patterns for detecting search queries
const SCRYFALL_OPERATORS = /(?:^|\s)(?:t:|c:|ci:|o:|pow:|tou:|cmc[<>=!]|mv[<>=!]|is:|has:|not:|set:|e:|r:|f:|id:|mana:|devotion:|produces:|keyword:|oracle:|name:|flavor:|art:|border:|frame:|game:|year:|date:|usd[<>=!]|eur[<>=!]|tix[<>=!])/i

function resolveCards(args: ManageCardArgs): string[] {
  if (args.cards && args.cards.length > 0) return args.cards
  if (args.name) return [args.name]
  throw new Error('Either "cards" or "name" must be provided')
}

function resolveTargetList(args: ManageCardArgs, sideboardSize: number): CardSetName {
  const useSideboard = args.to_sideboard && sideboardSize > 0
  if (useSideboard) return CARD_SET.SIDEBOARD
  if (args.to_alternates || (args.to_sideboard && sideboardSize === 0)) return CARD_SET.ALTERNATES
  return CARD_SET.MAINBOARD
}

function resolveSourceList(args: ManageCardArgs): CardSetName {
  if (args.from_sideboard) return CARD_SET.SIDEBOARD
  if (args.from_alternates) return CARD_SET.ALTERNATES
  return CARD_SET.MAINBOARD
}

// Map user-facing list names (from MCP schema) to CardSetName constants
function toListName(name: string): CardSetName {
  switch (name) {
    case 'mainboard': return CARD_SET.MAINBOARD
    case 'alternates': return CARD_SET.ALTERNATES
    case 'sideboard': return CARD_SET.SIDEBOARD
    case 'cut': return CARD_SET.CUT
    default: throw new Error(`Invalid list: "${name}". Valid lists are: mainboard, sideboard, alternates, cut`)
  }
}

export async function manageCard(storage: Storage, args: ManageCardArgs) {
  let deck = getDeckOrThrow(storage, args.deck_id)

  switch (args.action) {
    case 'add': {
      const cardStrings = resolveCards(args)
      const results: Array<{ name: string; set: string; collectorNumber: string; quantity: number; merged?: boolean }> = []

      const useCardsArray = Boolean(args.cards && args.cards.length > 0)

      for (const cardStr of cardStrings) {
        let setCode: string | undefined
        let collectorNumber: string | undefined
        let quantity = 1

        if (useCardsArray) {
          const parsed = parseCardString(cardStr)
          setCode = parsed.setCode
          collectorNumber = parsed.collectorNumber
          quantity = parsed.quantity
        } else {
          setCode = args.set_code
          collectorNumber = args.collector_number
          quantity = args.quantity || 1
        }

        // For the `cards` array path, `cardStr` is a parsed "Nx set collector"
        // label, not a real card name — skip name validation. For the single
        // `name` path, respect the user's `force` flag.
        const scryfallCard = await fetchScryfallCard(
          storage,
          cardStr,
          setCode,
          collectorNumber,
          { force: useCardsArray || args.force },
        )
        const cardIdentifier = createCardIdentifier(scryfallCard)
        const target = resolveTargetList(args, deck.format.sideboardSize)

        const deckCard = makeCardEntry({
          card: cardIdentifier,
          quantity,
          ownership: args.ownership as OwnershipStatus | undefined,
          roles: args.roles,
          primaryType: getPrimaryType(scryfallCard.type_line),
        })

        const result = addCardToDeck(deck, deckCard, target)
        deck = result.deck

        results.push({
          name: scryfallCard.name,
          set: scryfallCard.set,
          collectorNumber: scryfallCard.collector_number,
          quantity: result.meta.merged
            ? (findCardAcrossLists(deck, scryfallCard.name)?.card.quantity ?? quantity)
            : quantity,
          merged: result.meta.merged,
        })
      }

      storage.saveDeck(deck)
      return { success: true, cards: results }
    }
    case 'remove': {
      const cardNames = resolveCards(args)
      const target = resolveSourceList(args)
      const removed: string[] = []

      for (const cardName of cardNames) {
        const result = removeCardFromDeck(deck, cardName, target, args.quantity)
        deck = result.deck
        removed.push(cardName)
      }

      storage.saveDeck(deck)
      return { success: true, message: `Removed ${removed.join(', ')} from deck` }
    }
    case 'update': {
      if (args.to_alternates || args.to_sideboard) {
        throw new Error('to_alternates/to_sideboard are not supported on update. Use action: "move" with from/to parameters to move cards between lists.')
      }
      if (args.from_alternates || args.from_sideboard) {
        throw new Error('from_alternates/from_sideboard are not supported on update. Use action: "move" with from/to parameters to move cards between lists.')
      }
      if (args.from || args.to) {
        throw new Error('from/to are not supported on update. Use action: "move" to move cards between lists.')
      }

      const cardNames = resolveCards(args)
      const updated: Array<{ name: string; roles: string[] }> = []

      for (const cardName of cardNames) {
        const result = updateCardInDeck(deck, cardName, {
          roles: args.roles,
          addRoles: args.add_roles,
          removeRoles: args.remove_roles,
          ownership: args.ownership as OwnershipStatus | undefined,
          notes: args.notes,
        })
        deck = result.deck
        const found = findCardAcrossLists(deck, cardName)
        updated.push({ name: cardName, roles: found?.card.roles ?? [] })
      }

      storage.saveDeck(deck)
      return { success: true, cards: updated }
    }
    case 'move': {
      if (!args.from || !args.to) throw new Error('from and to are required for move')
      const fromList = toListName(args.from)
      const toList = toListName(args.to)
      if (toList === CARD_SET.SIDEBOARD && deck.format.sideboardSize === 0) {
        throw new Error(`Cannot move cards to sideboard: ${deck.format.type} format has no sideboard`)
      }
      const cardNames = resolveCards(args)
      const allMoved: string[] = []
      const allMerged: string[] = []

      for (const cardName of cardNames) {
        const result = moveCard(deck, cardName, fromList, toList, args.quantity)
        deck = result.deck
        allMoved.push(...result.meta.moved)
        allMerged.push(...result.meta.merged)
      }

      storage.saveDeck(deck)
      const messages: string[] = []
      if (allMoved.length > 0) messages.push(`Moved ${allMoved.join(', ')} from ${args.from} to ${args.to}`)
      if (allMerged.length > 0) messages.push(`Merged ${allMerged.join(', ')} with existing cards in ${args.to}`)
      return { success: true, message: messages.join('. ') }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

function formatCardResponse(scryfallCard: ScryfallCard) {
  return {
    name: scryfallCard.name,
    flavorName: scryfallCard.flavor_name,
    scryfallId: scryfallCard.id,
    manaCost: scryfallCard.mana_cost,
    cmc: scryfallCard.cmc,
    typeLine: scryfallCard.type_line,
    oracleText: getOracleText(scryfallCard),
    power: scryfallCard.power,
    toughness: scryfallCard.toughness,
    colors: scryfallCard.colors,
    colorIdentity: scryfallCard.color_identity,
    set: scryfallCard.set,
    collectorNumber: scryfallCard.collector_number,
    rarity: scryfallCard.rarity,
    prices: scryfallCard.prices,
    legalities: scryfallCard.legalities,
  }
}

function formatCardCompact(card: ScryfallCard): string {
  const setInfo = `${card.set.toUpperCase()}#${card.collector_number}`
  const canonicalSuffix = card.flavor_name ? ` (${card.name})` : ''
  const displayName = card.flavor_name ?? card.name
  const hasFaces = card.card_faces && card.card_faces.length >= 2

  if (hasFaces) {
    const front = card.card_faces![0]
    const back = card.card_faces![1]
    const lines: string[] = []

    lines.push(`${front.name} // ${back.name}${canonicalSuffix} • ${setInfo} • ${card.rarity} • ${card.layout}`)

    const frontPt = front.power && front.toughness ? ` ${front.power}/${front.toughness}` : ''
    const frontMana = front.mana_cost ? `${front.mana_cost} ` : ''
    lines.push(`Front: ${frontMana}${front.type_line || ''}${frontPt}`)
    if (front.oracle_text) lines.push(front.oracle_text)

    lines.push('---')

    const backPt = back.power && back.toughness ? ` ${back.power}/${back.toughness}` : ''
    const backMana = back.mana_cost ? `${back.mana_cost} ` : ''
    lines.push(`Back: ${backMana}${back.type_line || ''}${backPt}`)
    if (back.oracle_text) lines.push(back.oracle_text)

    return lines.join('\n')
  }

  const lines: string[] = []
  const pt = card.power && card.toughness ? ` ${card.power}/${card.toughness}` : ''
  const mana = card.mana_cost ? `${card.mana_cost} ` : ''
  lines.push(`${displayName}${canonicalSuffix} • ${setInfo} • ${card.rarity} • ${mana}${card.type_line}${pt}`)
  if (card.oracle_text) lines.push(card.oracle_text)

  return lines.join('\n')
}

function buildSearchResponse(
  result: SearchResult,
  limit: number,
  useCompact: boolean,
  header: string,
) {
  const cards = result.data.slice(0, limit)
  if (useCompact) {
    return `${header}\n\n${cards.map(formatCardCompact).join('\n\n')}`
  }
  return {
    totalCards: result.total_cards,
    hasMore: result.data.length > limit,
    cards: cards.map(formatCardResponse),
  }
}

export async function searchCardsHandler(args: SearchCardsArgs) {
  const useCompact = args.format !== 'json'
  const formatCard = useCompact ? formatCardCompact : formatCardResponse
  const limit = args.limit ?? 10

  if (args.set_code && args.collector_number) {
    const scryfallCard = await getCardBySetAndNumber(args.set_code, args.collector_number)
    if (!scryfallCard) throw new Error(`Card not found: ${args.set_code} ${args.collector_number}`)
    return formatCard(scryfallCard)
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(args.query)) {
    const scryfallCard = await getCardById(args.query)
    if (!scryfallCard) throw new Error(`Card not found with ID: ${args.query}`)
    return formatCard(scryfallCard)
  }

  if (SCRYFALL_OPERATORS.test(args.query)) {
    const result = await searchCards(args.query)
    if (!result) throw new Error(`Search failed for query: ${args.query}`)
    return buildSearchResponse(result, limit, useCompact, `Found ${result.total_cards} cards:`)
  }

  if (args.exact) {
    const scryfallCard = await searchCardByNameExact(args.query)
    if (!scryfallCard) throw new Error(`Card not found: ${args.query}`)
    return formatCard(scryfallCard)
  }

  const scryfallCard = await searchCardByName(args.query)
  if (scryfallCard) return formatCard(scryfallCard)

  // Scryfall's /cards/named?fuzzy returns 404 for both "no match" AND
  // "ambiguous match" (e.g. "Sephiroth" matches multiple printings).
  // Fall back to a name-substring search so Claude can disambiguate.
  const escapedName = args.query.replace(/"/g, '\\"')
  const fallback = await searchCards(`name:"${escapedName}"`)
  if (!fallback || fallback.total_cards === 0) {
    throw new Error(`Card not found: ${args.query}`)
  }
  const shown = Math.min(limit, fallback.data.length)
  const header = `Multiple cards match "${args.query}". Showing ${shown} of ${fallback.total_cards}:`
  return buildSearchResponse(fallback, limit, useCompact, header)
}
