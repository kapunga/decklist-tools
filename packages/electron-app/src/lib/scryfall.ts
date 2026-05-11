// Re-export all Scryfall utilities from the shared package
// This file exists to maintain the @/lib/scryfall import path used throughout the app

import { buildArtCropUrlFromId } from '@mtg-deckbuilder/shared'

export {
  // Core API functions
  searchCardByName,
  searchCardByNameExact,
  getCardBySetAndNumber,
  getCardById,
  getCardsByIds,
  lookupCardsByIdentifiers,
  autocomplete,
  searchCards,
  getCardPrintings,
  getAllSets,
  getSetByCode,

  // Utility functions
  getCardImageUrl,
  getCardFaceImageUrl,
  getCardArtCropUrl,
  formatManaCost,
  getColorIdentityString,
  sortColorsWUBRG,
  isLegalInFormat,
  listLegalities,
  matchesColorIdentity,
  searchCardsWithFilters,
  getCardPrices,

  // Constants
  WUBRG_ORDER,

  // Types
  type ScryfallSet,
  type AutocompleteResult,
  type SearchResult,
  type CardPrices,
} from '@mtg-deckbuilder/shared'

export { buildArtCropUrlFromId }

// Resolve a Scryfall art crop to a URL the renderer can use as background-image.
// Goes through the disk cache via IPC: cached files surface via the
// `cached-image://` custom protocol; on first miss we fetch from Scryfall and
// persist. If the IPC fetch fails (offline first time, transient error), we
// fall back to the direct CDN URL so the tile still renders.
export async function resolveArtCropUrl(
  scryfallId: string,
  face: 'front' | 'back' = 'front',
): Promise<string> {
  const cachedUrl = await window.electronAPI.getOrFetchArtCrop(scryfallId, face)
  return cachedUrl ?? buildArtCropUrlFromId(scryfallId, face)
}
