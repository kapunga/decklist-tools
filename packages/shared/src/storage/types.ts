import type { RoleDefinition } from '../types/index.js'

// Global roles file schema
export interface GlobalRolesFile {
  version: number
  roles: RoleDefinition[]
}

export class ConcurrentModificationError extends Error {
  constructor(
    public readonly deckId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Concurrent modification on deck ${deckId}: ` +
      `expected version ${expectedVersion}, found ${actualVersion}. ` +
      `Another process may have modified this deck.`
    )
    this.name = 'ConcurrentModificationError'
  }
}
