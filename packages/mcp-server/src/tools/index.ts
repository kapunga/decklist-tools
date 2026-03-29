import { Storage } from '@mtg-deckbuilder/shared'
import { getToolDefinitions } from './schemas.js'
import { listDecks, getDeck, manageDeck, viewDeck, searchDecksForCard } from './deck-tools.js'
import { manageCard, searchCardsHandler } from './card-tools.js'
import { listRoles, manageRole } from './role-tools.js'
import { manageCommander } from './commander-tools.js'
import { getInterestList, manageInterestList } from './interest-tools.js'
import { listDeckNotes, manageDeckNote } from './note-tools.js'
import { getCollectionFilter } from './collection-tools.js'
import { validateInputLengths } from './helpers.js'
import {
  validateManageDeckArgs,
  validateManageCardArgs,
  validateSearchCardsArgs,
  validateViewDeckArgs,
  validateManageRoleArgs,
  validateManageCommanderArgs,
  validateManageInterestListArgs,
  validateManageDeckNoteArgs,
} from './types.js'

export { getToolDefinitions }

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  storage: Storage
): Promise<unknown> {
  validateInputLengths(args)

  switch (name) {
    case 'list_decks':
      return listDecks(storage)
    case 'get_deck':
      return getDeck(storage, args.identifier as string)
    case 'manage_deck':
      return manageDeck(storage, validateManageDeckArgs(args))
    case 'manage_card':
      return manageCard(storage, validateManageCardArgs(args))
    case 'search_cards':
      return searchCardsHandler(validateSearchCardsArgs(args))
    case 'view_deck':
      return viewDeck(storage, validateViewDeckArgs(args))
    case 'list_roles':
      return listRoles(storage, args.deck_id as string | undefined)
    case 'manage_role':
      return manageRole(storage, validateManageRoleArgs(args))
    case 'manage_commander':
      return manageCommander(storage, validateManageCommanderArgs(args))
    case 'get_interest_list':
      return getInterestList(storage)
    case 'manage_interest_list':
      return manageInterestList(storage, validateManageInterestListArgs(args))
    case 'list_deck_notes':
      return listDeckNotes(storage, args.deck_id as string)
    case 'manage_deck_note':
      return manageDeckNote(storage, validateManageDeckNoteArgs(args))
    case 'search_decks_for_card':
      return searchDecksForCard(storage, args.card_name as string)
    case 'get_collection_filter':
      return getCollectionFilter(storage)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
