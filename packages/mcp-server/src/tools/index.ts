import { Storage } from '@mtg-deckbuilder/shared'
import { getToolDefinitions } from './schemas.js'
import { listDecks, getDeck, manageDeck, viewDeck, searchDecksForCard } from './deck-tools.js'
import { manageCard, searchCardsHandler } from './card-tools.js'
import { listRoles, manageRole } from './role-tools.js'
import { setCommanders } from './commander-tools.js'
import { getInterestList, manageInterestList } from './interest-tools.js'
import { listDeckNotes, manageDeckNote } from './note-tools.js'
import { getCollectionFilter } from './collection-tools.js'
import type {
  ManageDeckArgs,
  ManageCardArgs,
  SearchCardsArgs,
  ViewDeckArgs,
  ManageRoleArgs,
  SetCommandersArgs,
  ManageInterestListArgs,
  ManageDeckNoteArgs,
} from './types.js'

export { getToolDefinitions }

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  storage: Storage
): Promise<unknown> {
  switch (name) {
    case 'list_decks':
      return listDecks(storage)
    case 'get_deck':
      return getDeck(storage, args.identifier as string)
    case 'manage_deck':
      return manageDeck(storage, args as unknown as ManageDeckArgs)
    case 'manage_card':
      return manageCard(storage, args as unknown as ManageCardArgs)
    case 'search_cards':
      return searchCardsHandler(args as unknown as SearchCardsArgs)
    case 'view_deck':
      return viewDeck(storage, args as unknown as ViewDeckArgs)
    case 'list_roles':
      return listRoles(storage, args.deck_id as string | undefined)
    case 'manage_role':
      return manageRole(storage, args as unknown as ManageRoleArgs)
    case 'set_commanders':
      return setCommanders(storage, args as unknown as SetCommandersArgs)
    case 'get_interest_list':
      return getInterestList(storage)
    case 'manage_interest_list':
      return manageInterestList(storage, args as unknown as ManageInterestListArgs)
    case 'list_deck_notes':
      return listDeckNotes(storage, args.deck_id as string)
    case 'manage_deck_note':
      return manageDeckNote(storage, args as unknown as ManageDeckNoteArgs)
    case 'search_decks_for_card':
      return searchDecksForCard(storage, args.card_name as string)
    case 'get_collection_filter':
      return getCollectionFilter(storage)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
