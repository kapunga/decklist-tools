// Re-export all Scryfall utilities from the shared package
// This file exists to maintain the @/lib/scryfall import path used throughout the app

export {
  // Core API functions
  searchCardByName,
  searchCardByNameExact,
  getCardBySetAndNumber,
  getCardById,
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
