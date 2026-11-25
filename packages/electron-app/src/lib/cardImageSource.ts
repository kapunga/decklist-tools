// Where a card image comes from: a file in the disk cache when there is one, served
// through the app's `cached-image://` protocol, otherwise Scryfall's CDN.

const CACHED_SCHEME = 'cached-image:'

/** The URL the renderer can load a cached image file from (file:// is blocked). */
export function cachedImageUrl(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() ?? ''
  return `${CACHED_SCHEME}//cache/${encodeURIComponent(fileName)}`
}

/** The cached file if there is one, else the CDN url, else nothing. */
export function imageSource(cachedPath: string | null, cdnUrl: string | null): string | null {
  return cachedPath ? cachedImageUrl(cachedPath) : cdnUrl
}

/**
 * What to try after `failedUrl` did not load: the CDN if it was a cached file (the
 * cache can point at a file that is gone), otherwise nothing — the image is unavailable.
 */
export function sourceAfterError(failedUrl: string, cdnUrl: string | null): string | null {
  return failedUrl.startsWith(CACHED_SCHEME) ? cdnUrl : null
}
