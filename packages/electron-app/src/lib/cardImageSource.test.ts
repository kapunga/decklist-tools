import { describe, it, expect } from 'vitest'
import { cachedImageUrl, imageSource, sourceAfterError } from './cardImageSource'

const CDN = 'https://cards.scryfall.io/large/front/a/b/abc.jpg'

describe('cachedImageUrl', () => {
  it('serves a cached file through the cached-image protocol by file name', () => {
    expect(cachedImageUrl('/Users/me/cache/images/abc_front.jpg')).toBe('cached-image://cache/abc_front.jpg')
  })

  it('handles Windows paths', () => {
    expect(cachedImageUrl('C:\\Users\\me\\cache\\images\\abc.jpg')).toBe('cached-image://cache/abc.jpg')
  })
})

describe('imageSource', () => {
  it('prefers the cached file', () => {
    expect(imageSource('/cache/images/abc.jpg', CDN)).toBe('cached-image://cache/abc.jpg')
  })

  it('falls back to the CDN when nothing is cached', () => {
    expect(imageSource(null, CDN)).toBe(CDN)
  })

  it('is null when there is neither', () => {
    expect(imageSource(null, null)).toBeNull()
  })
})

describe('sourceAfterError', () => {
  it('retries from the CDN when a cached file failed to load', () => {
    // The cache index can point at a file that has since been deleted.
    expect(sourceAfterError('cached-image://cache/abc.jpg', CDN)).toBe(CDN)
  })

  it('gives up when the CDN itself failed', () => {
    expect(sourceAfterError(CDN, CDN)).toBeNull()
  })

  it('gives up when a cached file failed and there is no CDN url', () => {
    expect(sourceAfterError('cached-image://cache/abc.jpg', null)).toBeNull()
  })
})
