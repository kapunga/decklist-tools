import type { Deck, DeckCard } from '../types/index.js'

export function prepareLines(text: string): string[] {
  return text.split('\n').map(l => l.trim())
}

export function getConfirmedCards(deck: Deck): DeckCard[] {
  return deck.cards.filter(c => c.inclusion === 'confirmed')
}

export function getMaybeboardCards(deck: Deck): DeckCard[] {
  return [
    ...deck.cards.filter(c => c.inclusion === 'considering'),
    ...deck.alternates
  ]
}
