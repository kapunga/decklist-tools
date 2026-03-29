import type { Deck, CardIdentifier } from '../types/index.js'
import type { OpResult, CommanderMeta } from './types.js'

export function addCommander(_deck: Deck, _commander: CardIdentifier): OpResult<CommanderMeta> {
  throw new Error('Not yet implemented')
}

export function removeCommander(_deck: Deck, _commanderName: string): OpResult<CommanderMeta> {
  throw new Error('Not yet implemented')
}

export function swapCommander(_deck: Deck, _oldName: string, _newCommander: CardIdentifier): OpResult<CommanderMeta> {
  throw new Error('Not yet implemented')
}
