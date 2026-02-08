import {
  Storage,
  type DeckCard,
  type InclusionStatus,
  type OwnershipStatus,
  type ScryfallCard,
  generateDeckCardId,
  searchCardByNameExact,
  searchCardByName,
  getCardBySetAndNumber,
  getCardById,
  searchCards,
  isDoubleFacedCard,
} from '@mtg-deckbuilder/shared'
import { getDeckOrThrow, fetchScryfallCard, createCardIdentifier, findCardInList, findCardIndexInList, parseCardString } from './helpers.js'
import type { ManageCardArgs, SearchCardsArgs } from './types.js'

// Scryfall operator patterns for detecting search queries
const SCRYFALL_OPERATORS = /(?:^|\s)(?:t:|c:|ci:|o:|pow:|tou:|cmc[<>=!]|mv[<>=!]|is:|has:|not:|set:|e:|r:|f:|id:|mana:|devotion:|produces:|keyword:|oracle:|name:|flavor:|art:|border:|frame:|game:|year:|date:|usd[<>=!]|eur[<>=!]|tix[<>=!])/i

function resolveCards(args: ManageCardArgs): string[] {
  if (args.cards && args.cards.length > 0) return args.cards
  if (args.name) return [args.name]
  throw new Error('Either "cards" or "name" must be provided')
}

export async function manageCard(storage: Storage, args: ManageCardArgs) {
  const deck = getDeckOrThrow(storage, args.deck_id)

  switch (args.action) {
    case 'add': {
      const cardStrings = resolveCards(args)
      const results: Array<{ name: string; set: string; collectorNumber: string; quantity: number; merged?: boolean }> = []

      for (const cardStr of cardStrings) {
        let setCode: string | undefined
        let collectorNumber: string | undefined
        let quantity = 1

        // If using the new cards array format, parse the card string
        if (args.cards && args.cards.length > 0) {
          const parsed = parseCardString(cardStr)
          setCode = parsed.setCode
          collectorNumber = parsed.collectorNumber
          quantity = parsed.quantity
        } else {
          // Legacy single-card via name field
          setCode = args.set_code
          collectorNumber = args.collector_number
          quantity = args.quantity || 1
        }

        const scryfallCard = await fetchScryfallCard(cardStr, setCode, collectorNumber)
        const cardIdentifier = createCardIdentifier(scryfallCard)

        // Determine target list
        const targetList = args.to_sideboard
          ? deck.sideboard
          : args.to_alternates
            ? deck.alternates
            : deck.cards

        // Check if card already exists in the target list
        const existingCard = findCardInList(targetList, scryfallCard.name)

        if (existingCard) {
          // Merge with existing card: increment quantity and merge roles
          existingCard.quantity += quantity
          if (args.roles && args.roles.length > 0) {
            existingCard.roles = [...new Set([...existingCard.roles, ...args.roles])]
          }
          results.push({
            name: scryfallCard.name,
            set: scryfallCard.set,
            collectorNumber: scryfallCard.collector_number,
            quantity: existingCard.quantity,
            merged: true,
          })
        } else {
          // Create new card entry
          const deckCard: DeckCard = {
            id: generateDeckCardId(),
            card: cardIdentifier,
            quantity,
            inclusion: (args.status as InclusionStatus) || 'confirmed',
            ownership: (args.ownership as OwnershipStatus) || 'unknown',
            roles: args.roles || [],
            typeLine: scryfallCard.type_line,
            isPinned: false,
            addedAt: new Date().toISOString(),
            addedBy: 'user',
          }

          targetList.push(deckCard)
          results.push({
            name: scryfallCard.name,
            set: scryfallCard.set,
            collectorNumber: scryfallCard.collector_number,
            quantity: deckCard.quantity,
          })
        }
      }

      storage.saveDeck(deck)
      return {
        success: true,
        cards: results,
      }
    }
    case 'remove': {
      const cardNames = resolveCards(args)
      const targetList = args.from_sideboard
        ? deck.sideboard
        : args.from_alternates
          ? deck.alternates
          : deck.cards

      const removed: string[] = []
      for (const cardName of cardNames) {
        const cardIndex = findCardIndexInList(targetList, cardName)
        if (cardIndex === -1) throw new Error(`Card not found in deck: ${cardName}`)

        if (args.quantity && args.quantity < targetList[cardIndex].quantity) {
          targetList[cardIndex].quantity -= args.quantity
        } else {
          targetList.splice(cardIndex, 1)
        }
        removed.push(cardName)
      }

      storage.saveDeck(deck)
      return { success: true, message: `Removed ${removed.join(', ')} from deck` }
    }
    case 'update': {
      // Reject move-related parameters
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
        let card: DeckCard | undefined
        for (const list of [deck.cards, deck.alternates, deck.sideboard]) {
          card = findCardInList(list, cardName)
          if (card) break
        }
        if (!card) throw new Error(`Card not found in deck: ${cardName}`)

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
      const cardNames = resolveCards(args)

      const getList = (name: string): DeckCard[] => {
        switch (name) {
          case 'mainboard': return deck.cards
          case 'alternates': return deck.alternates
          case 'sideboard': return deck.sideboard
          default: throw new Error(`Invalid list: "${name}". Valid lists are: mainboard, sideboard, alternates`)
        }
      }

      const fromList = getList(args.from)
      const toList = getList(args.to)
      const moved: string[] = []
      const merged: string[] = []

      for (const cardName of cardNames) {
        const cardIndex = findCardIndexInList(fromList, cardName)
        if (cardIndex === -1) throw new Error(`Card not found in ${args.from}: ${cardName}`)

        const [card] = fromList.splice(cardIndex, 1)

        // Check if card already exists in target list
        const existingCard = findCardInList(toList, cardName)
        if (existingCard) {
          // Merge with existing card
          existingCard.quantity += card.quantity
          existingCard.roles = [...new Set([...existingCard.roles, ...card.roles])]
          merged.push(cardName)
        } else {
          toList.push(card)
          moved.push(cardName)
        }
      }

      storage.saveDeck(deck)
      const messages: string[] = []
      if (moved.length > 0) messages.push(`Moved ${moved.join(', ')} from ${args.from} to ${args.to}`)
      if (merged.length > 0) messages.push(`Merged ${merged.join(', ')} with existing cards in ${args.to}`)
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
    oracleText: scryfallCard.oracle_text,
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

  if (hasFaces && (isDoubleFacedCard(card) || card.layout === 'adventure')) {
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
