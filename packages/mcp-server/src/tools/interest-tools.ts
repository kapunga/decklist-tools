import { Storage, INTEREST_LIST_ID, CARD_SET, CARD_SOURCE, makeCardEntry, getPrimaryType, createCardIdentifier } from '@mtg-deckbuilder/shared'
import type { CardEntry, CardList, CardSource } from '@mtg-deckbuilder/shared'
import { fetchScryfallCard } from './helpers.js'
import type { ManageInterestListArgs } from './types.js'

function getOrCreateInterestList(storage: Storage): CardList {
  const existing = storage.getCardList(INTEREST_LIST_ID)
  if (existing) return existing

  const now = new Date().toISOString()
  return {
    id: INTEREST_LIST_ID,
    name: 'Interest List',
    version: 0,  // saveCardList will bump to 1
    createdAt: now,
    updatedAt: now,
    cardSets: [{ name: CARD_SET.MAINBOARD, entries: [] }],
  }
}

function getMainEntries(list: CardList): CardEntry[] {
  return list.cardSets[0]?.entries ?? []
}

function setMainEntries(list: CardList, entries: CardEntry[]): CardList {
  const firstSet = list.cardSets[0]
  const setName = firstSet?.name ?? CARD_SET.MAINBOARD
  return {
    ...list,
    cardSets: [{ name: setName, entries }],
  }
}

export function getInterestList(storage: Storage) {
  return getOrCreateInterestList(storage)
}

export async function manageInterestList(storage: Storage, args: ManageInterestListArgs) {
  switch (args.action) {
    case 'add': {
      if (!args.name) throw new Error('name is required for add')
      const list = getOrCreateInterestList(storage)

      const scryfallCard = await fetchScryfallCard(
        storage,
        args.name,
        args.set_code,
        args.collector_number,
        { force: args.force },
      )

      // Normalise source to the CardSource union
      const source: CardSource = (args.source === 'import' || args.source === 'claude') ? args.source : CARD_SOURCE.USER

      const entry = makeCardEntry({
        card: createCardIdentifier(scryfallCard),
        notes: args.notes,
        potentialDecks: args.potential_decks,
        source,
        primaryType: getPrimaryType(scryfallCard.type_line),
      })

      const updated = setMainEntries(list, [...getMainEntries(list), entry])
      storage.saveCardList(updated)
      return { success: true, item: entry }
    }
    case 'remove': {
      if (!args.card_name) throw new Error('card_name is required for remove')
      const list = getOrCreateInterestList(storage)
      const entries = getMainEntries(list)
      const itemIndex = entries.findIndex(
        (i) => i.card.name.toLowerCase() === args.card_name!.toLowerCase()
      )
      if (itemIndex === -1) throw new Error(`Card not found in interest list: ${args.card_name}`)

      const next = entries.filter((_, i) => i !== itemIndex)
      storage.saveCardList(setMainEntries(list, next))
      return { success: true, message: `Removed ${args.card_name} from interest list` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}
