import { lookupCardsByIdentifiers } from '@mtg-deckbuilder/shared'
import type { ScryfallCard } from '@/types'
import { createCardCache, createRemoteFetch } from './cardCache'

// The app's single card cache. This file is the only place the cache meets the outside
// world (IPC to the disk cache, HTTP to Scryfall); everything else imports `cardCache`.
// The effects are arrows so `window.electronAPI` is read when a lookup runs, not when
// this module loads.

// Batches from several deck tiles queue behind one rate limiter, so a batch can wait a
// while before it is even sent. Past this it is reported as failed and retried next time.
const REMOTE_TIMEOUT_MS = 30_000

// The cache treats a failed effect as "nothing came back" and carries on, so the failure
// is reported here, where it happens.
const reporting = <A extends unknown[], R>(what: string, effect: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    try {
      return await effect(...args)
    } catch (error) {
      console.error(`Card cache could not ${what}:`, error)
      throw error
    }
  }

const lookupByIds = (ids: string[]): Promise<(ScryfallCard | null)[]> =>
  lookupCardsByIdentifiers(ids.map(id => ({ id })))

export const cardCache = createCardCache({
  readDisk: reporting('read cached cards', async ids =>
    (await window.electronAPI.getCachedCards(ids)) as Record<string, ScryfallCard>),
  fetchRemote: createRemoteFetch(reporting('fetch cards from Scryfall', lookupByIds), REMOTE_TIMEOUT_MS),
  writeDisk: reporting('write cached cards', cards => window.electronAPI.saveCachedCards(cards)),
})
