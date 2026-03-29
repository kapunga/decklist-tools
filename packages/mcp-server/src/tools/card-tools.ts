import {
  Storage,
  type DeckCard,
  type InclusionStatus,
  type OwnershipStatus,
  type ScryfallCard,
  type DeckListName,
  generateDeckCardId,
  searchCardByNameExact,
  searchCardByName,
  getCardBySetAndNumber,
  getCardById,
  searchCards,
  getOracleText,
  INCLUSION_STATUS,
  OWNERSHIP_STATUS,
  ADDED_BY,
  DECK_LIST,
  addCardToDeck,
  removeCardFromDeck,
  moveCard,
  findCardAcrossLists,
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

function resolveTargetList(args: ManageCardArgs, sideboardSize: number): DeckListName {
  const useSideboard = args.to_sideboard && sideboardSize > 0
  if (useSideboard) return DECK_LIST.SIDEBOARD
  if (args.to_alternates || (args.to_sideboard && sideboardSize === 0)) return DECK_LIST.ALTERNATES
  return DECK_LIST.MAINBOARD
}

function resolveSourceList(args: ManageCardArgs): DeckListName {
  if (args.from_sideboard) return DECK_LIST.SIDEBOARD
  if (args.from_alternates) return DECK_LIST.ALTERNATES
  return DECK_LIST.MAINBOARD
}

// Map user-facing list names (from MCP schema) to DeckListName constants
function toListName(name: string): DeckListName {
  switch (name) {
    case 'mainboard': return DECK_LIST.MAINBOARD
    case 'alternates': return DECK_LIST.ALTERNATES
    case 'sideboard': return DECK_LIST.SIDEBOARD
    default: throw new Error(`Invalid list: "${name}". Valid lists are: mainboard, sideboard, alternates`)
  }
}

export async function manageCard(storage: Storage, args: ManageCardArgs) {
  let deck = getDeckOrThrow(storage, args.deck_id)

  switch (args.action) {
    case 'add': {
      const cardStrings = resolveCards(args)
      const results: Array<{ name: string; set: string; collectorNumber: string; quantity: number; merged?: boolean }> = []

      for (const cardStr of cardStrings) {
        let setCode: string | undefined
        let collectorNumber: string | undefined
        let quantity = 1

        if (args.cards && args.cards.length > 0) {
          const parsed = parseCardString(cardStr)
          setCode = parsed.setCode
          collectorNumber = parsed.collectorNumber
          quantity = parsed.quantity
        } else {
          setCode = args.set_code
          collectorNumber = args.collector_number
          quantity = args.quantity || 1
        }

        const scryfallCard = await fetchScryfallCard(storage, cardStr, setCode, collectorNumber)
        const cardIdentifier = createCardIdentifier(scryfallCard)
        const target = resolveTargetList(args, deck.format.sideboardSize)

        const deckCard: DeckCard = {
          id: generateDeckCardId(),
          card: cardIdentifier,
          quantity,
          inclusion: (args.status as InclusionStatus) || INCLUSION_STATUS.CONFIRMED,
          ownership: (args.ownership as OwnershipStatus) || OWNERSHIP_STATUS.UNKNOWN,
          roles: args.roles || [],
          typeLine: scryfallCard.type_line,
          isPinned: false,
          addedAt: new Date().toISOString(),
          addedBy: ADDED_BY.USER,
        }

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
        const found = findCardAcrossLists(deck, cardName)
        if (!found) throw new Error(`Card not found in deck: ${cardName}`)
        const card = found.card

        if (args.roles !== undefined) card.roles = args.roles
        if (args.add_roles) {
          card.roles = [...new Set([...card.roles, ...args.add_roles])]
        }
        if (args.remove_roles) {
          card.roles = card.roles.filter((r) => !args.remove_roles!.includes(r))
        }
        if (args.status !== undefined) card.inclusion = args.status as InclusionStatus
        if (args.ownership !== undefined) card.ownership = args.ownership as OwnershipStatus
        if (args.pinned !== undefined) card.isPinned = args.pinned
        if (args.notes !== undefined) card.notes = args.notes

        updated.push({ name: card.card.name, roles: card.roles })
      }

      storage.saveDeck(deck)
      return { success: true, cards: updated }
    }
    case 'move': {
      if (!args.from || !args.to) throw new Error('from and to are required for move')
      const fromList = toListName(args.from)
      const toList = toListName(args.to)
      if (toList === DECK_LIST.SIDEBOARD && deck.format.sideboardSize === 0) {
        throw new Error(`Cannot move cards to sideboard: ${deck.format.type} format has no sideboard`)
      }
      const cardNames = resolveCards(args)
      const allMoved: string[] = []
      const allMerged: string[] = []

      for (const cardName of cardNames) {
        const result = moveCard(deck, cardName, fromList, toList)
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
  const hasFaces = card.card_faces && card.card_faces.length >= 2

  if (hasFaces) {
    const front = card.card_faces![0]
    const back = card.card_faces![1]
    const lines: string[] = []

    lines.push(`${front.name} // ${back.name} • ${setInfo} • ${card.rarity} • ${card.layout}`)

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
  lines.push(`${card.name} • ${setInfo} • ${card.rarity} • ${mana}${card.type_line}${pt}`)
  if (card.oracle_text) lines.push(card.oracle_text)

  return lines.join('\n')
}

export async function searchCardsHandler(args: SearchCardsArgs) {
  const useCompact = args.format !== 'json'
  const formatCard = useCompact ? formatCardCompact : formatCardResponse

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
    const limit = args.limit ?? 10
    const cards = result.data.slice(0, limit)

    if (useCompact) {
      const formatted = cards.map(formatCardCompact)
      return `Found ${result.total_cards} cards:\n\n${formatted.join('\n\n')}`
    }

    return {
      totalCards: result.total_cards,
      hasMore: result.data.length > limit,
      cards: cards.map(formatCardResponse),
    }
  }

  let scryfallCard
  if (args.exact) {
    scryfallCard = await searchCardByNameExact(args.query)
  } else {
    scryfallCard = await searchCardByName(args.query)
  }
  if (!scryfallCard) throw new Error(`Card not found: ${args.query}`)
  return formatCard(scryfallCard)
}
