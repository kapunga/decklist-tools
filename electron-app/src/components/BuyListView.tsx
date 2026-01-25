import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, ExternalLink, ArrowUpDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore, useBuyList, type BuyListItem } from '@/hooks/useStore'
import { getCardById, getCardPrices, type CardPrices } from '@/lib/scryfall'

type SortKey = 'name' | 'quantity' | 'price'
type SortDirection = 'asc' | 'desc'

export function BuyListView() {
  const setView = useStore(state => state.setView)
  const selectDeck = useStore(state => state.selectDeck)
  const buyList = useBuyList()

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [prices, setPrices] = useState<Record<string, CardPrices>>({})
  const [loadingPrices, setLoadingPrices] = useState(false)

  // Fetch prices for all cards
  useEffect(() => {
    if (buyList.length === 0) return

    const fetchPrices = async () => {
      setLoadingPrices(true)
      const newPrices: Record<string, CardPrices> = {}

      for (const item of buyList) {
        if (item.scryfallId) {
          try {
            const card = await getCardById(item.scryfallId)
            if (card) {
              newPrices[item.cardName.toLowerCase()] = getCardPrices(card)
            }
          } catch (e) {
            // Ignore individual card errors
          }
        }
      }

      setPrices(newPrices)
      setLoadingPrices(false)
    }

    fetchPrices()
  }, [buyList])

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }, [sortKey])

  const handleNavigateToDeck = useCallback((deckId: string) => {
    selectDeck(deckId)
  }, [selectDeck])

  // Sort the buy list
  const sortedList = useMemo(() => {
    const sorted = [...buyList]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'name':
          comparison = a.cardName.localeCompare(b.cardName)
          break
        case 'quantity':
          comparison = a.totalQuantity - b.totalQuantity
          break
        case 'price':
          const priceA = parseFloat(prices[a.cardName.toLowerCase()]?.usd || '0')
          const priceB = parseFloat(prices[b.cardName.toLowerCase()]?.usd || '0')
          comparison = priceA - priceB
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [buyList, sortKey, sortDirection, prices])

  // Calculate totals
  const totals = useMemo(() => {
    let totalCards = 0
    let totalPrice = 0

    for (const item of buyList) {
      totalCards += item.totalQuantity
      const price = parseFloat(prices[item.cardName.toLowerCase()]?.usd || '0')
      totalPrice += price * item.totalQuantity
    }

    return { totalCards, totalPrice }
  }, [buyList, prices])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('decks')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Buy List</h1>
          <span className="text-muted-foreground">
            {buyList.length} unique {buyList.length === 1 ? 'card' : 'cards'} ({totals.totalCards} total)
          </span>
          {loadingPrices && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {!loadingPrices && totals.totalPrice > 0 && (
            <span className="ml-auto text-lg font-semibold">
              Est. Total: ${totals.totalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {buyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="mb-2">No cards marked as "Need to Buy".</p>
            <p className="text-sm">Mark cards as "Need to Buy" in your decks to see them here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    Card Name
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-center p-3 w-20">
                  <button
                    onClick={() => handleSort('quantity')}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    Qty
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left p-3">Decks</th>
                <th className="text-right p-3 w-24">
                  <button
                    onClick={() => handleSort('price')}
                    className="flex items-center gap-1 hover:text-primary ml-auto"
                  >
                    Price
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-center p-3 w-32">Buy</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.map(item => (
                <BuyListRow
                  key={item.cardName}
                  item={item}
                  prices={prices[item.cardName.toLowerCase()]}
                  onNavigateToDeck={handleNavigateToDeck}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

interface BuyListRowProps {
  item: BuyListItem
  prices?: CardPrices
  onNavigateToDeck: (deckId: string) => void
}

function BuyListRow({ item, prices, onNavigateToDeck }: BuyListRowProps) {
  return (
    <tr className="border-b hover:bg-accent/30">
      <td className="p-3">
        <span className="font-medium">{item.cardName}</span>
        <span className="text-xs text-muted-foreground ml-2">
          ({item.setCode.toUpperCase()})
        </span>
      </td>
      <td className="p-3 text-center">
        {item.totalQuantity}
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          {item.decks.map(deck => (
            <button
              key={deck.deckId}
              onClick={() => onNavigateToDeck(deck.deckId)}
              className="text-xs text-primary hover:underline"
            >
              {deck.deckName} ({deck.quantity})
            </button>
          ))}
        </div>
      </td>
      <td className="p-3 text-right">
        {prices?.usd ? (
          <span>${prices.usd}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="p-3">
        <div className="flex items-center justify-center gap-1">
          {prices?.tcgplayer && (
            <a
              href={prices.tcgplayer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/80 flex items-center gap-1"
            >
              TCGPlayer
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {prices?.cardmarket && (
            <a
              href={prices.cardmarket}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 flex items-center gap-1"
            >
              Cardmarket
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {!prices?.tcgplayer && !prices?.cardmarket && (
            <span className="text-xs text-muted-foreground">No links</span>
          )}
        </div>
      </td>
    </tr>
  )
}
