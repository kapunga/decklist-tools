import { useState, useCallback, useEffect } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ScryfallCard } from '@/types'
import { isDoubleFacedCard } from '@/types'
import { getCardImageUrl, getCardFaceImageUrl } from '@/lib/scryfall'

interface CardImageProps {
  card: ScryfallCard
  size?: 'small' | 'normal' | 'large'
  className?: string
  showFlipButton?: boolean
}

export function CardImage({
  card,
  size = 'normal',
  className,
  showFlipButton = true
}: CardImageProps) {
  const [currentFace, setCurrentFace] = useState<0 | 1>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [cachedPath, setCachedPath] = useState<string | null>(null)

  const isDFC = isDoubleFacedCard(card)

  // Check for cached image
  useEffect(() => {
    const checkCache = async () => {
      try {
        const face = isDFC ? (currentFace === 0 ? 'front' : 'back') : undefined
        const path = await window.electronAPI.getCachedImagePath(card.id, face)
        setCachedPath(path)
      } catch {
        setCachedPath(null)
      }
    }
    checkCache()
  }, [card.id, currentFace, isDFC])

  // Get the appropriate image URL (use cached if available)
  const scryfallUrl = isDFC
    ? getCardFaceImageUrl(card, currentFace, size)
    : getCardImageUrl(card, size)

  // Use custom protocol for cached images to avoid file:// security restrictions
  const getCachedImageUrl = (filePath: string): string => {
    // Extract filename from the path (e.g., "{scryfallId}.jpg" or "{scryfallId}_front.jpg")
    const filename = filePath.split('/').pop() || filePath.split('\\').pop() || ''
    // Format: cached-image://cache/filename.jpg - the "cache" host gives us a proper URL structure
    return `cached-image://cache/${encodeURIComponent(filename)}`
  }

  const imageUrl = cachedPath ? getCachedImageUrl(cachedPath) : scryfallUrl

  const handleFlip = useCallback(() => {
    setCurrentFace(prev => (prev === 0 ? 1 : 0))
    setIsLoading(true)
    setCachedPath(null) // Reset cached path on flip to trigger re-check
  }, [])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
  }, [])

  // Get face name for accessibility
  const faceName = isDFC && card.card_faces
    ? card.card_faces[currentFace]?.name || card.name
    : card.name

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted rounded-lg text-muted-foreground">
          <span className="text-sm">Failed to load image</span>
          <span className="text-xs mt-1">{card.name}</span>
        </div>
      )}

      {/* Card image */}
      <img
        src={imageUrl || ''}
        alt={faceName}
        className={cn(
          'rounded-lg transition-opacity duration-200',
          isLoading && 'opacity-0',
          !isLoading && !hasError && 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* Flip button for DFCs */}
      {isDFC && showFlipButton && (
        <Button
          variant="secondary"
          size="icon"
          onClick={handleFlip}
          className={cn(
            'absolute bottom-2 right-2 h-8 w-8',
            'opacity-30 hover:opacity-100 transition-opacity',
            'bg-background/80 hover:bg-background'
          )}
          title={`Flip to ${currentFace === 0 ? 'back' : 'front'} face`}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

// Simplified card image for lists (no flip support, smaller footprint)
interface SimpleCardImageProps {
  imageUrl: string
  name: string
  size?: 'small' | 'normal' | 'large'
  className?: string
}

export function SimpleCardImage({
  imageUrl,
  name,
  className
}: SimpleCardImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <div className={cn('relative inline-block', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-xs">
          No image
        </div>
      )}

      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'rounded-lg transition-opacity duration-200',
          isLoading && 'opacity-0',
          !isLoading && !hasError && 'opacity-100'
        )}
        onLoad={() => { setIsLoading(false); setHasError(false) }}
        onError={() => { setIsLoading(false); setHasError(true) }}
        loading="lazy"
      />
    </div>
  )
}
