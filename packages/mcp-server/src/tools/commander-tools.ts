import {
  type Storage,
  addCommander,
  removeCommander,
  swapCommander,
} from '@mtg-deckbuilder/shared'
import { getDeckOrThrow, fetchScryfallCard, createCardIdentifier } from './helpers.js'
import type { ManageCommanderArgs } from './types.js'

export async function manageCommander(storage: Storage, args: ManageCommanderArgs) {
  const deck = getDeckOrThrow(storage, args.deck_id)

  switch (args.action) {
    case 'add': {
      const scryfallCard = await fetchScryfallCard(
        storage,
        args.commander_name,
        args.set_code,
        args.collector_number,
        { force: args.force },
      )
      const commander = createCardIdentifier(scryfallCard)

      const result = addCommander(deck, commander)
      storage.saveDeck(result.deck)

      return {
        success: true,
        commanders: result.meta.commanders,
        colorIdentity: result.meta.colorIdentity,
      }
    }

    case 'remove': {
      const result = removeCommander(deck, args.commander_name)
      storage.saveDeck(result.deck)

      return {
        success: true,
        commanders: result.meta.commanders,
        colorIdentity: result.meta.colorIdentity,
      }
    }

    case 'swap': {
      if (!args.new_commander_name) {
        throw new Error('new_commander_name is required for swap action')
      }

      const newScryfallCard = await fetchScryfallCard(
        storage,
        args.new_commander_name,
        args.new_set_code,
        args.new_collector_number,
        { force: args.force },
      )
      const newCommander = createCardIdentifier(newScryfallCard)

      const result = swapCommander(deck, args.commander_name, newCommander)
      storage.saveDeck(result.deck)

      return {
        success: true,
        commanders: result.meta.commanders,
        colorIdentity: result.meta.colorIdentity,
      }
    }

    default:
      throw new Error(`Unknown commander action: ${args.action}`)
  }
}
