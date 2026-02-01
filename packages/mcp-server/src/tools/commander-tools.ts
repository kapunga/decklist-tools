import { Storage } from '@mtg-deckbuilder/shared'
import { getDeckOrThrow, fetchScryfallCard, createCardIdentifier } from './helpers.js'
import type { SetCommandersArgs } from './types.js'

export async function setCommanders(storage: Storage, args: SetCommandersArgs) {
  const deck = getDeckOrThrow(storage, args.deck_id)

  if (deck.format.type !== 'commander') {
    throw new Error('Commanders can only be set for Commander format decks')
  }

  const scryfallCard = await fetchScryfallCard(args.commander_name, args.set_code, args.collector_number)
  const commander = createCardIdentifier(scryfallCard)

  const existingIndex = deck.commanders.findIndex(
    (c) => c.name.toLowerCase() === commander.name.toLowerCase()
  )
  if (existingIndex >= 0) throw new Error(`${commander.name} is already a commander`)

  deck.commanders.push(commander)
  deck.colorIdentity = scryfallCard.color_identity

  storage.saveDeck(deck)

  return {
    success: true,
    commanders: deck.commanders.map((c) => c.name),
    colorIdentity: deck.colorIdentity,
  }
}
