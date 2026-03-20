import type { Storage } from '@mtg-deckbuilder/shared'
import { getDeckOrThrow, fetchScryfallCard, createCardIdentifier } from './helpers.js'
import type { ManageCommanderArgs } from './types.js'

async function recomputeColorIdentity(
  commanders: { name: string; setCode: string; collectorNumber: string }[]
): Promise<string[]> {
  const colors = new Set<string>()
  for (const cmd of commanders) {
    const card = await fetchScryfallCard(cmd.name, cmd.setCode, cmd.collectorNumber)
    for (const c of card.color_identity) {
      colors.add(c)
    }
  }
  return Array.from(colors)
}

export async function manageCommander(storage: Storage, args: ManageCommanderArgs) {
  const deck = getDeckOrThrow(storage, args.deck_id)

  if (deck.format.type !== 'commander') {
    throw new Error('Commanders can only be managed for Commander format decks')
  }

  switch (args.action) {
    case 'add': {
      const scryfallCard = await fetchScryfallCard(args.commander_name, args.set_code, args.collector_number)
      const commander = createCardIdentifier(scryfallCard)

      const existingIndex = deck.commanders.findIndex(
        (c) => c.name.toLowerCase() === commander.name.toLowerCase()
      )
      if (existingIndex >= 0) throw new Error(`${commander.name} is already a commander`)

      deck.commanders.push(commander)
      deck.colorIdentity = await recomputeColorIdentity(deck.commanders)

      storage.saveDeck(deck)

      return {
        success: true,
        commanders: deck.commanders.map((c) => c.name),
        colorIdentity: deck.colorIdentity,
      }
    }

    case 'remove': {
      const removeIndex = deck.commanders.findIndex(
        (c) => c.name.toLowerCase() === args.commander_name.toLowerCase()
      )
      if (removeIndex < 0) throw new Error(`${args.commander_name} is not a commander in this deck`)

      deck.commanders.splice(removeIndex, 1)
      deck.colorIdentity = deck.commanders.length > 0
        ? await recomputeColorIdentity(deck.commanders)
        : []

      storage.saveDeck(deck)

      return {
        success: true,
        commanders: deck.commanders.map((c) => c.name),
        colorIdentity: deck.colorIdentity,
      }
    }

    case 'swap': {
      if (!args.new_commander_name) {
        throw new Error('new_commander_name is required for swap action')
      }

      const swapIndex = deck.commanders.findIndex(
        (c) => c.name.toLowerCase() === args.commander_name.toLowerCase()
      )
      if (swapIndex < 0) throw new Error(`${args.commander_name} is not a commander in this deck`)

      const newScryfallCard = await fetchScryfallCard(
        args.new_commander_name, args.new_set_code, args.new_collector_number
      )
      const newCommander = createCardIdentifier(newScryfallCard)

      // Check the new commander isn't already there
      const duplicateIndex = deck.commanders.findIndex(
        (c) => c.name.toLowerCase() === newCommander.name.toLowerCase()
      )
      if (duplicateIndex >= 0) throw new Error(`${newCommander.name} is already a commander`)

      deck.commanders[swapIndex] = newCommander
      deck.colorIdentity = await recomputeColorIdentity(deck.commanders)

      storage.saveDeck(deck)

      return {
        success: true,
        commanders: deck.commanders.map((c) => c.name),
        colorIdentity: deck.colorIdentity,
      }
    }

    default:
      throw new Error(`Unknown commander action: ${args.action}`)
  }
}
