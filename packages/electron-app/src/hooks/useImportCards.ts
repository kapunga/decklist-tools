import { useState, useCallback, useRef } from 'react'
import { formats, detectFormat, type ParsedCard } from '@/lib/formats'
import { searchCardByName, getCardBySetAndNumber } from '@/lib/scryfall'
import { SCRYFALL, IMPORT_PREVIEW } from '@/lib/constants'
import type { CardEntry } from '@/types'
import { generateDeckCardId, OWNERSHIP_STATUS, CARD_SOURCE, CARD_SET } from '@/types'
import type { ImportProgress, ResolvedCard, UseImportCardsResult } from './types'

export type { ImportProgress, ResolvedCard, UseImportCardsResult } from './types'

/**
 * Hook to encapsulate shared import logic between ImportDialog and ImportNewDeckDialog.
 * Handles format detection, text parsing, Scryfall lookups, and CardEntry construction.
 */
export function useImportCards(sideboardSize?: number): UseImportCardsResult {
  const [text, setText] = useState('')
  const [formatId, setFormatId] = useState('auto')
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 })
  const [errors, setErrors] = useState<string[]>([])

  // Use ref for progress to avoid re-renders during lookup
  const progressRef = useRef<ImportProgress>({ current: 0, total: 0 })

  const handleTextChange = useCallback((value: string) => {
    setText(value)

    if (!value.trim()) {
      setParsedCards([])
      return
    }

    const resolved = formatId === 'auto'
      ? detectFormat(value).format
      : formats.find(f => f.id === formatId) || detectFormat(value).format

    const cards = resolved.parse(value)
    setParsedCards(cards)
  }, [formatId])

  const handleFormatChange = useCallback((value: string) => {
    setFormatId(value)
    if (text.trim()) {
      const resolved = value === 'auto'
        ? detectFormat(text).format
        : formats.find(f => f.id === value) || detectFormat(text).format
      setParsedCards(resolved.parse(text))
    }
  }, [text])

  /**
   * Look up all parsed cards on Scryfall and construct CardEntry objects.
   * Returns resolved cards and any errors encountered.
   */
  const lookupCards = useCallback(async (): Promise<{ resolvedCards: ResolvedCard[]; errors: string[] }> => {
    if (parsedCards.length === 0) {
      return { resolvedCards: [], errors: [] }
    }

    setIsImporting(true)
    setErrors([])
    progressRef.current = { current: 0, total: parsedCards.length }
    setImportProgress({ current: 0, total: parsedCards.length })

    const newErrors: string[] = []
    const resolvedCards: ResolvedCard[] = []

    let lastProgressUpdate = 0
    for (let i = 0; i < parsedCards.length; i++) {
      const parsed = parsedCards[i]
      progressRef.current = { current: i + 1, total: parsedCards.length }

      // Only update UI periodically to reduce flickering
      if (i - lastProgressUpdate >= IMPORT_PREVIEW.PROGRESS_UPDATE_INTERVAL || i === parsedCards.length - 1) {
        setImportProgress({ ...progressRef.current })
        lastProgressUpdate = i
      }

      try {
        // Try to fetch specific printing first if set and collector number are available
        let scryfallCard = null
        if (parsed.setCode && parsed.collectorNumber) {
          scryfallCard = await getCardBySetAndNumber(parsed.setCode, parsed.collectorNumber)
        }

        // Fall back to name search if specific printing not found
        if (!scryfallCard) {
          scryfallCard = await searchCardByName(parsed.name)
        }

        if (!scryfallCard) {
          newErrors.push(`Card not found: ${parsed.name}`)
          continue
        }

        // Use any roles from the parsed data
        const roles = [...(parsed.roles || [])]

        const deckCard: CardEntry = {
          id: generateDeckCardId(),
          card: {
            scryfallId: scryfallCard.id,
            name: scryfallCard.name,
            setCode: parsed.setCode || scryfallCard.set,
            collectorNumber: parsed.collectorNumber || scryfallCard.collector_number
          },
          quantity: parsed.quantity,
          ownership: OWNERSHIP_STATUS.OWNED,
          roles,
          typeLine: scryfallCard.type_line,  // Store type line for grouping
          addedAt: new Date().toISOString(),
          source: CARD_SOURCE.IMPORT
        }

        const hasSideboard = sideboardSize !== undefined && sideboardSize > 0
        const listType = parsed.isSideboard
          ? (hasSideboard ? CARD_SET.SIDEBOARD : CARD_SET.ALTERNATES)
          : parsed.isMaybeboard ? CARD_SET.ALTERNATES
          : CARD_SET.MAINBOARD

        resolvedCards.push({ card: deckCard, listType })

        // Small delay to avoid rate limiting Scryfall
        if (i < parsedCards.length - 1) {
          await new Promise(resolve => setTimeout(resolve, SCRYFALL.IMPORT_DELAY_MS))
        }
      } catch (error) {
        newErrors.push(`Error looking up ${parsed.name}: ${error}`)
      }
    }

    setErrors(newErrors)
    setIsImporting(false)

    return { resolvedCards, errors: newErrors }
  }, [parsedCards])

  const reset = useCallback(() => {
    setText('')
    setFormatId('auto')
    setParsedCards([])
    setErrors([])
    setImportProgress({ current: 0, total: 0 })
    setIsImporting(false)
  }, [])

  // Derived values
  const mainDeckCount = parsedCards.filter(c => !c.isSideboard && !c.isMaybeboard).length
  const sideboardCount = parsedCards.filter(c => c.isSideboard).length
  const maybeboardCount = parsedCards.filter(c => c.isMaybeboard).length
  const detectedFormat = text.trim() ? detectFormat(text) : null
  const totalCardCount = parsedCards.reduce((sum, c) => sum + c.quantity, 0)

  return {
    // State
    text,
    formatId,
    parsedCards,
    isImporting,
    importProgress,
    errors,

    // Derived values
    mainDeckCount,
    sideboardCount,
    maybeboardCount,
    detectedFormat,
    totalCardCount,

    // Actions
    setText,
    setFormatId,
    handleTextChange,
    handleFormatChange,
    lookupCards,
    reset
  }
}
