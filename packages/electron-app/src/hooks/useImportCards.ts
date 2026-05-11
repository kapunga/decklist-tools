import { useState, useCallback, useRef } from 'react'
import { formats, detectFormat, type ParsedCard, type ScryfallIdentifier } from '@mtg-deckbuilder/shared'
import { searchCardByName, lookupCardsByIdentifiers } from '@/lib/scryfall'
import { OWNERSHIP_STATUS, CARD_SOURCE, CARD_SET, makeCardEntry, getPrimaryType, createCardIdentifier } from '@/types'
import type { ScryfallCard } from '@/types'
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
   *
   * Strategy: one batched POST /cards/collection (75 cards/request) covers the
   * happy path. Identifiers entered with set + collector_number get a specific
   * printing; the rest go in by name (exact match). Anything Scryfall couldn't
   * resolve falls back to per-card fuzzy `searchCardByName` — the slow path,
   * but realistically only hit by typos in hand-typed lists.
   */
  const lookupCards = useCallback(async (): Promise<{ resolvedCards: ResolvedCard[]; errors: string[] }> => {
    if (parsedCards.length === 0) {
      return { resolvedCards: [], errors: [] }
    }

    setIsImporting(true)
    setErrors([])
    progressRef.current = { current: 0, total: parsedCards.length }
    setImportProgress({ current: 0, total: parsedCards.length })

    const identifiers: ScryfallIdentifier[] = parsedCards.map(p =>
      p.setCode && p.collectorNumber
        ? { set: p.setCode, collector_number: p.collectorNumber }
        : { name: p.name },
    )

    const batched = await lookupCardsByIdentifiers(identifiers, (processed) => {
      progressRef.current = { current: processed, total: parsedCards.length }
      setImportProgress({ ...progressRef.current })
    })

    const resolved: (ScryfallCard | null)[] = await Promise.all(
      batched.map(async (card, i) =>
        card ?? (await searchCardByName(parsedCards[i].name)) as ScryfallCard | null,
      ),
    )

    const newErrors: string[] = []
    const resolvedCards: ResolvedCard[] = []
    const fetchedScryfallCards: ScryfallCard[] = []

    const hasSideboard = sideboardSize !== undefined && sideboardSize > 0

    for (let i = 0; i < parsedCards.length; i++) {
      const parsed = parsedCards[i]
      const scryfallCard = resolved[i]
      if (!scryfallCard) {
        newErrors.push(`Card not found: ${parsed.name}`)
        continue
      }

      fetchedScryfallCards.push(scryfallCard)

      const deckCard = makeCardEntry({
        card: createCardIdentifier(scryfallCard, {
          setCode: parsed.setCode,
          collectorNumber: parsed.collectorNumber,
        }),
        quantity: parsed.quantity,
        ownership: OWNERSHIP_STATUS.OWNED,
        roles: [...(parsed.roles || [])],
        source: CARD_SOURCE.IMPORT,
        primaryType: getPrimaryType(scryfallCard.type_line),
      })

      const listType = parsed.isSideboard
        ? (hasSideboard ? CARD_SET.SIDEBOARD : CARD_SET.ALTERNATES)
        : parsed.isMaybeboard ? CARD_SET.ALTERNATES
        : CARD_SET.MAINBOARD

      resolvedCards.push({ card: deckCard, listType })
    }

    if (fetchedScryfallCards.length > 0) {
      try {
        await window.electronAPI.saveCachedCards(fetchedScryfallCards)
      } catch (error) {
        console.error('Failed to persist imported cards to local cache:', error)
      }
    }

    setErrors(newErrors)
    setIsImporting(false)

    return { resolvedCards, errors: newErrors }
  }, [parsedCards, sideboardSize])

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
