import type { Deck, DeckCard, DeckListName } from '../types/index.js'
import type { OpResult, AddCardMeta, RemoveCardMeta, MoveCardMeta } from './types.js'

export function mergeCardIntoList(_list: DeckCard[], _card: DeckCard): DeckCard[] {
  throw new Error('Not yet implemented')
}

export function addCardToDeck(_deck: Deck, _card: DeckCard, _target: DeckListName): OpResult<AddCardMeta> {
  throw new Error('Not yet implemented')
}

export function removeCardFromDeck(_deck: Deck, _cardName: string, _target: DeckListName, _quantity?: number): OpResult<RemoveCardMeta> {
  throw new Error('Not yet implemented')
}

export function moveCard(_deck: Deck, _cardName: string, _from: DeckListName, _to: DeckListName): OpResult<MoveCardMeta> {
  throw new Error('Not yet implemented')
}

export function findCardAcrossLists(_deck: Deck, _cardName: string): { card: DeckCard; list: DeckListName } | undefined {
  throw new Error('Not yet implemented')
}
