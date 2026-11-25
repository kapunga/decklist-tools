import { useState, useCallback, useEffect } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ScryfallCard } from '@/types'
import { isDoubleFacedCard } from '@/types'
import { getCardImageUrl, getCardFaceImageUrl } from '@/lib/scryfall'
import { imageSource, sourceAfterError } from '@/lib/cardImageSource'

type ImageSize = 'small' | 'normal' | 'large'

interface CardImageProps {
  card: ScryfallCard
  size?: ImageSize
  className?: string
  showFlipButton?: boolean
}

// Scryfall's pixel widths per size. Every card image is 488:680, so the frame can
// reserve its space before any image has loaded.
const NATURAL_WIDTH: Record<ImageSize, number> = { small: 146, normal: 488, large: 672 }
const CARD_ASPECT_RATIO = '488 / 680'

/** The face a viewer chose, and the card they chose it for. */
interface FaceChoice {
  cardId: string
  face: 0 | 1
}

/** An image handed to the <img>, and which card face it belongs to. */
interface ShownImage {
  key: string
  url: string
}

export function CardImage({
  card,
  size = 'normal',
  className,
  showFlipButton = true
}: CardImageProps) {
  // A chosen face belongs to one card: a different card starts on its front.
  const [faceChoice, setFaceChoice] = useState<FaceChoice>({ cardId: card.id, face: 0 })
  const currentFace = faceChoice.cardId === card.id ? faceChoice.face : 0

  const [shown, setShown] = useState<ShownImage | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [failedKey, setFailedKey] = useState<string | null>(null)

  const isDFC = isDoubleFacedCard(card)
  // Flip-layout cards (CHK-style) have one image_uris but render the alternate
  // face by 180° rotation. We reuse `currentFace` as a binary "flipped?" bit.
  const isFlipLayout = card.layout === 'flip'
  const isRotated = isFlipLayout && currentFace === 1

  // Flip-layout cards have only one URL — rotation is render-side.
  const scryfallUrl = isDFC
    ? getCardFaceImageUrl(card, currentFace, size)
    : getCardImageUrl(card, size)
  const cachedFace = isDFC ? (currentFace === 0 ? 'front' : 'back') : undefined
  const imageKey = `${card.id}:${cachedFace ?? 'single'}`

  // Ask whether this face is in the disk cache, and only then hand the <img> a source:
  // the cached file if there is one, the CDN otherwise. Until the answer arrives the
  // <img> keeps what it was showing, so moving between cards swaps one image for the
  // next with no blank frame and never requests the CDN copy of a cached image. The
  // cancel flag drops an answer that arrives after the card or face has changed.
  useEffect(() => {
    let cancelled = false
    const show = (cachedPath: string | null) => {
      if (cancelled) return
      const url = imageSource(cachedPath, scryfallUrl)
      if (url) setShown({ key: imageKey, url })
      else setFailedKey(imageKey)
    }
    window.electronAPI.getCachedImagePath(card.id, cachedFace).then(show, () => show(null))
    return () => { cancelled = true }
  }, [card.id, cachedFace, imageKey, scryfallUrl])

  const handleFlip = useCallback(() => {
    setFaceChoice({ cardId: card.id, face: currentFace === 0 ? 1 : 0 })
  }, [card.id, currentFace])

  const handleLoad = useCallback(() => {
    setHasLoadedOnce(true)
    setFailedKey(null)
  }, [])

  const handleError = useCallback(() => {
    // An error for an image this component has already moved on from says nothing
    // about the current one.
    if (!shown || shown.key !== imageKey) return
    const retryUrl = sourceAfterError(shown.url, scryfallUrl)
    if (retryUrl) setShown({ key: shown.key, url: retryUrl })
    else setFailedKey(shown.key)
  }, [shown, imageKey, scryfallUrl])

  const hasError = failedKey === imageKey
  const isLoading = !hasLoadedOnce && !hasError

  // Get face name for accessibility. Flip-layout cards have card_faces names
  // (e.g. "Akki Lavarunner" / "Tok-Tok, Volcano Born") even though the image
  // is shared.
  const faceName = (isDFC || isFlipLayout) && card.card_faces
    ? card.card_faces[currentFace]?.name || card.name
    : card.name

  return (
    <div
      className={cn('relative block w-full', className)}
      style={{ maxWidth: NATURAL_WIDTH[size], aspectRatio: CARD_ASPECT_RATIO }}
    >
      {/* Loading state — only before the first image; later swaps keep the old one up */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-muted rounded-lg text-muted-foreground">
          <span className="text-sm">Failed to load image</span>
          <span className="text-xs mt-1">{card.name}</span>
        </div>
      )}

      {/* Card image */}
      <img
        src={shown?.url}
        alt={faceName}
        className={cn(
          'block w-full h-full rounded-lg transition-opacity duration-200',
          hasLoadedOnce ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transform: isRotated ? 'rotate(180deg)' : undefined }}
        onLoad={handleLoad}
        onError={handleError}
        decoding="async"
      />

      {/* Flip button for DFCs and flip-layout cards */}
      {(isDFC || isFlipLayout) && showFlipButton && (
        <Button
          variant="secondary"
          size="icon"
          onClick={handleFlip}
          className={cn(
            'absolute bottom-2 right-2 z-20 h-8 w-8',
            'opacity-30 hover:opacity-100 transition-opacity',
            'bg-background/80 hover:bg-background'
          )}
          title={
            isFlipLayout
              ? (currentFace === 0 ? 'Rotate 180°' : 'Show upright')
              : `Flip to ${currentFace === 0 ? 'back' : 'front'} face`
          }
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
