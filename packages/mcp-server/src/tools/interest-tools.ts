import { Storage, generateDeckCardId } from '@mtg-deckbuilder/shared'
import { fetchScryfallCard, createCardIdentifier } from './helpers.js'
import type { ManageInterestListArgs } from './types.js'

export function getInterestList(storage: Storage) {
  return storage.getInterestList()
}

export async function manageInterestList(storage: Storage, args: ManageInterestListArgs) {
  switch (args.action) {
    case 'add': {
      if (!args.name) throw new Error('name is required for add')
      const interestList = storage.getInterestList()

      const scryfallCard = await fetchScryfallCard(args.name, args.set_code, args.collector_number)

      const item = {
        id: generateDeckCardId(),
        card: createCardIdentifier(scryfallCard),
        notes: args.notes,
        potentialDecks: args.potential_decks,
        addedAt: new Date().toISOString(),
        source: args.source,
      }

      interestList.items.push(item)
      storage.saveInterestList(interestList)
      return { success: true, item }
    }
    case 'remove': {
      if (!args.card_name) throw new Error('card_name is required for remove')
      const interestList = storage.getInterestList()
      const itemIndex = interestList.items.findIndex(
        (i) => i.card.name.toLowerCase() === args.card_name!.toLowerCase()
      )
      if (itemIndex === -1) throw new Error(`Card not found in interest list: ${args.card_name}`)

      interestList.items.splice(itemIndex, 1)
      storage.saveInterestList(interestList)
      return { success: true, message: `Removed ${args.card_name} from interest list` }
    }
    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}
