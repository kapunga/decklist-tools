import { Storage } from '@mtg-deckbuilder/shared'
import { getToolDefinitions } from './schemas.js'
import {
  listDecks,
  getDeck,
  manageDeck,
  deckList,
  deckCurve,
  deckNotes,
  deckPullList,
  deckExport,
  searchDecksForCard,
} from './deck-tools.js'
import { manageCard, searchCardsHandler } from './card-tools.js'
import { listRoles, manageRole } from './role-tools.js'
import { manageCommander } from './commander-tools.js'
import { listCardLists, getCardList, manageCardList } from './list-tools.js'
import { listDeckNotes, manageDeckNote } from './note-tools.js'
import { getCollectionFilter } from './collection-tools.js'
import { validateInputLengths } from './helpers.js'
import {
  validateManageDeckArgs,
  validateManageCardArgs,
  validateSearchCardsArgs,
  validateDeckListArgs,
  validateDeckCurveArgs,
  validateDeckNotesArgs,
  validateDeckPullListArgs,
  validateDeckExportArgs,
  validateManageRoleArgs,
  validateManageCommanderArgs,
  validateManageCardListArgs,
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
    case 'get_deck': {
      const detail = args.detail
      if (detail !== undefined && detail !== 'summary' && detail !== 'full') {
        throw new Error(`'detail' must be 'summary' or 'full' (got '${String(detail)}')`)
      }
      return getDeck(storage, args.identifier as string, detail)
    }
    case 'manage_deck':
      return manageDeck(storage, validateManageDeckArgs(args))
    case 'manage_card':
      return manageCard(storage, validateManageCardArgs(args))
    case 'search_cards':
      return searchCardsHandler(validateSearchCardsArgs(args))
    case 'deck_list':
      return deckList(storage, validateDeckListArgs(args))
    case 'deck_curve':
      return deckCurve(storage, validateDeckCurveArgs(args))
    case 'deck_notes':
      return deckNotes(storage, validateDeckNotesArgs(args))
    case 'deck_pull_list':
      return deckPullList(storage, validateDeckPullListArgs(args))
    case 'deck_export':
      return deckExport(storage, validateDeckExportArgs(args))
    case 'list_roles':
      return listRoles(storage, args.deck_id as string | undefined)
    case 'manage_role':
      return manageRole(storage, validateManageRoleArgs(args))
    case 'manage_commander':
      return manageCommander(storage, validateManageCommanderArgs(args))
    case 'list_card_lists':
      return listCardLists(storage)
    case 'get_card_list':
      return getCardList(storage, args.identifier as string)
    case 'manage_card_list':
      return manageCardList(storage, validateManageCardListArgs(args))
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
