import { useState, useCallback, useRef } from 'react'
import { formats, detectFormat, type ParsedCard } from '@/lib/formats'
import { searchCardByName } from '@/lib/scryfall'
import { SCRYFALL, IMPORT_PREVIEW } from '@/lib/constants'
import type { DeckCard, CardRole } from '@/types'

export interface ImportProgress {
  current: number
  total: number
}

export interface ResolvedCard {
  card: DeckCard
  listType: 'cards' | 'alternates' | 'sideboard'
}

export interface UseImportCardsResult {
  // State
  text: string
  formatId: string
  parsedCards: ParsedCard[]
  isImporting: boolean
  importProgress: ImportProgress
  errors: string[]

  // Derived values
  mainDeckCount: number
  sideboardCount: number
  maybeboardCount: number
  detectedFormat: ReturnType<typeof detectFormat> | null
  totalCardCount: number

  // Actions
  setText: (value: string) => void
  setFormatId: (value: string) => void
  handleTextChange: (value: string) => void
  handleFormatChange: (value: string) => void
  lookupCards: () => Promise<{ resolvedCards: ResolvedCard[]; errors: string[] }>
  reset: () => void
}

/**
 * Hook to encapsulate shared import logic between ImportDialog and ImportNewDeckDialog.
 * Handles format detection, text parsing, Scryfall lookups, and DeckCard construction.
 */
export function useImportCards(): UseImportCardsResult {
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

    const format = formatId === 'auto'
      ? detectFormat(value)
      : formats.find(f => f.id === formatId) || detectFormat(value)

    const cards = format.parse(value)
    setParsedCards(cards)
  }, [formatId])

  const handleFormatChange = useCallback((value: string) => {
    setFormatId(value)
    if (text.trim()) {
      const format = value === 'auto'
        ? detectFormat(text)
        : formats.find(f => f.id === value) || detectFormat(text)
      setParsedCards(format.parse(text))
    }
  }, [text])

  /**
   * Look up all parsed cards on Scryfall and construct DeckCard objects.
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
        const scryfallCard = await searchCardByName(parsed.name)

        if (!scryfallCard) {
          newErrors.push(`Card not found: ${parsed.name}`)
          continue
        }

        // Infer role from type
        let role: CardRole = parsed.role as CardRole || 'support'
        const typeLine = scryfallCard.type_line.toLowerCase()
        if (typeLine.includes('land') && role === 'support') {
          role = 'land'
        } else if (typeLine.includes('legendary creature') && role === 'support') {
          role = 'core'
        }

        const deckCard: DeckCard = {
          card: {
            scryfallId: scryfallCard.id,
            name: scryfallCard.name,
            setCode: parsed.setCode || scryfallCard.set,
            collectorNumber: parsed.collectorNumber || scryfallCard.collector_number
          },
          quantity: parsed.quantity,
          inclusion: parsed.isMaybeboard ? 'considering' : 'confirmed',
          ownership: 'owned',
          role,
          isPinned: false,
          tags: parsed.tags || [],
          addedAt: new Date().toISOString(),
          addedBy: 'import'
        }

        const listType = parsed.isSideboard ? 'sideboard'
          : parsed.isMaybeboard ? 'alternates'
          : 'cards'

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
