import { useState, useEffect, useCallback } from 'react'
import { Database, Image, Trash2, RefreshCw, Loader2, HardDrive, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/hooks/useStore'

interface CacheStats {
  jsonCacheCount: number
  jsonCacheSizeBytes: number
  imageCacheCount: number
  imageCacheSizeBytes: number
  totalSizeBytes: number
  oldestEntry?: string
  newestEntry?: string
}

interface CacheLoadProgress {
  phase: 'calculating' | 'loading' | 'complete' | 'cancelled' | 'error'
  totalCards: number
  cachedCards: number
  currentCard?: string
  errors: string[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Never'
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function CacheSettingsSection() {
  const config = useStore(state => state.config)
  const updateConfig = useStore(state => state.updateConfig)

  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState<'json' | 'images' | 'all' | null>(null)

  const [imageCacheEnabled, setImageCacheEnabled] = useState(config?.imageCacheEnabled ?? true)
  const [imageCacheMaxSize, setImageCacheMaxSize] = useState(config?.imageCacheMaxSize ?? 500)
  const [cacheExpiryDays, setCacheExpiryDays] = useState(config?.scryfallCacheExpiryDays ?? 7)

  // Load all cards progress state
  const [loadProgress, setLoadProgress] = useState<CacheLoadProgress | null>(null)
  const [isLoadingAll, setIsLoadingAll] = useState(false)

  useEffect(() => {
    if (config) {
      setImageCacheEnabled(config.imageCacheEnabled ?? true)
      setImageCacheMaxSize(config.imageCacheMaxSize ?? 500)
      setCacheExpiryDays(config.scryfallCacheExpiryDays ?? 7)
    }
  }, [config])

  const loadStats = useCallback(async () => {
    try {
      const cacheStats = await window.electronAPI.getCacheStats()
      setStats(cacheStats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Subscribe to cache progress events
  useEffect(() => {
    const unsubscribe = window.electronAPI.onCacheProgress((progress) => {
      setLoadProgress(progress)

      if (progress.phase === 'complete' || progress.phase === 'cancelled' || progress.phase === 'error') {
        setIsLoadingAll(false)
        loadStats() // Refresh stats when done
      }
    })

    return unsubscribe
  }, [loadStats])

  const handleToggleImageCache = useCallback(async (enabled: boolean) => {
    setImageCacheEnabled(enabled)
    await updateConfig({ imageCacheEnabled: enabled })
  }, [updateConfig])

  const handleMaxSizeChange = useCallback(async (value: number) => {
    setImageCacheMaxSize(value)
    await updateConfig({ imageCacheMaxSize: value })
  }, [updateConfig])

  const handleExpiryChange = useCallback(async (value: number) => {
    setCacheExpiryDays(value)
    await updateConfig({ scryfallCacheExpiryDays: value })
  }, [updateConfig])

  const handleClearJsonCache = useCallback(async () => {
    setActionLoading('clear-json')
    try {
      await window.electronAPI.clearJsonCache()
      await loadStats()
    } catch (error) {
      console.error('Failed to clear JSON cache:', error)
    } finally {
      setActionLoading(null)
      setShowClearDialog(null)
    }
  }, [loadStats])

  const handleClearImageCache = useCallback(async () => {
    setActionLoading('clear-images')
    try {
      await window.electronAPI.clearImageCache()
      await loadStats()
    } catch (error) {
      console.error('Failed to clear image cache:', error)
    } finally {
      setActionLoading(null)
      setShowClearDialog(null)
    }
  }, [loadStats])

  const handleClearAllCache = useCallback(async () => {
    setActionLoading('clear-all')
    try {
      await window.electronAPI.clearAllCache()
      await loadStats()
    } catch (error) {
      console.error('Failed to clear all cache:', error)
    } finally {
      setActionLoading(null)
      setShowClearDialog(null)
    }
  }, [loadStats])

  const handleRebuildIndex = useCallback(async () => {
    setActionLoading('rebuild')
    try {
      await window.electronAPI.rebuildCacheIndex()
      await loadStats()
    } catch (error) {
      console.error('Failed to rebuild cache index:', error)
    } finally {
      setActionLoading(null)
    }
  }, [loadStats])

  const handleLoadAllCards = useCallback(async (includeImages: boolean) => {
    setIsLoadingAll(true)
    setLoadProgress({
      phase: 'calculating',
      totalCards: 0,
      cachedCards: 0,
      errors: []
    })
    try {
      await window.electronAPI.loadAllCardsToCache(includeImages)
    } catch (error) {
      console.error('Failed to load all cards:', error)
      setIsLoadingAll(false)
      setLoadProgress(null)
    }
  }, [])

  const handleCancelLoad = useCallback(async () => {
    try {
      await window.electronAPI.cancelCacheLoad()
    } catch (error) {
      console.error('Failed to cancel cache load:', error)
    }
  }, [])

  const progressPercent = loadProgress && loadProgress.totalCards > 0
    ? Math.round((loadProgress.cachedCards / loadProgress.totalCards) * 100)
    : 0

  if (loading) {
    return (
      <div className="p-4 rounded-lg border bg-card flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cache Statistics */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-medium">Cache Statistics</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto"
            onClick={loadStats}
            disabled={!!actionLoading || isLoadingAll}
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Database className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-lg font-semibold">{stats?.jsonCacheCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                Card Data ({formatBytes(stats?.jsonCacheSizeBytes ?? 0)})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Image className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-lg font-semibold">{stats?.imageCacheCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                Images ({formatBytes(stats?.imageCacheSizeBytes ?? 0)})
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Total cache size:</span>
            <span className="font-medium">{formatBytes(stats?.totalSizeBytes ?? 0)}</span>
          </div>
          {stats?.oldestEntry && (
            <div className="flex justify-between">
              <span>Oldest entry:</span>
              <span>{formatDate(stats.oldestEntry)}</span>
            </div>
          )}
          {stats?.newestEntry && (
            <div className="flex justify-between">
              <span>Newest entry:</span>
              <span>{formatDate(stats.newestEntry)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Load All Cards Section */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="font-medium mb-4">Load All Cards</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pre-cache all cards from your decks for offline access. Only cards not already in the cache will be fetched.
        </p>

        {isLoadingAll && loadProgress ? (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {loadProgress.phase === 'calculating' ? (
                    'Calculating cards to fetch...'
                  ) : loadProgress.phase === 'loading' ? (
                    `Loading: ${loadProgress.currentCard || '...'}`
                  ) : loadProgress.phase === 'complete' ? (
                    'Complete!'
                  ) : loadProgress.phase === 'cancelled' ? (
                    'Cancelled'
                  ) : (
                    'Error'
                  )}
                </span>
                <span className="font-medium">
                  {loadProgress.cachedCards} / {loadProgress.totalCards} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    loadProgress.phase === 'complete' ? 'bg-green-500' :
                    loadProgress.phase === 'cancelled' ? 'bg-yellow-500' :
                    loadProgress.phase === 'error' ? 'bg-red-500' :
                    'bg-primary'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Cancel button */}
            {(loadProgress.phase === 'calculating' || loadProgress.phase === 'loading') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelLoad}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            )}

            {/* Errors */}
            {loadProgress.errors.length > 0 && (
              <div className="mt-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs max-h-24 overflow-auto">
                {loadProgress.errors.slice(0, 5).map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
                {loadProgress.errors.length > 5 && (
                  <div className="mt-1 font-medium">
                    ...and {loadProgress.errors.length - 5} more errors
                  </div>
                )}
              </div>
            )}

            {/* Dismiss button when done */}
            {(loadProgress.phase === 'complete' || loadProgress.phase === 'cancelled' || loadProgress.phase === 'error') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLoadProgress(null)}
              >
                Dismiss
              </Button>
            )}
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Load All Cards
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleLoadAllCards(false)}>
                Card Data Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLoadAllCards(true)}>
                Card Data + Images
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Cache Settings */}
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <h3 className="font-medium">Cache Settings</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="image-cache-toggle">Enable Image Caching</Label>
            <p className="text-xs text-muted-foreground">
              Cache card images for offline viewing
            </p>
          </div>
          <Switch
            id="image-cache-toggle"
            checked={imageCacheEnabled}
            onCheckedChange={handleToggleImageCache}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-cache-size">Max Image Cache Size (MB)</Label>
          <Input
            id="max-cache-size"
            type="number"
            min={100}
            max={10000}
            value={imageCacheMaxSize}
            onChange={e => handleMaxSizeChange(parseInt(e.target.value) || 500)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Maximum size for cached images before old entries are removed
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cache-expiry">Cache Expiry (Days)</Label>
          <Input
            id="cache-expiry"
            type="number"
            min={1}
            max={365}
            value={cacheExpiryDays}
            onChange={e => handleExpiryChange(parseInt(e.target.value) || 7)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            How long to keep cached Scryfall data before refreshing
          </p>
        </div>
      </div>

      {/* Cache Actions */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="font-medium mb-4">Cache Actions</h3>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog('json')}
            disabled={!!actionLoading || isLoadingAll}
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            Clear Card Data
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog('images')}
            disabled={!!actionLoading || isLoadingAll}
            className="gap-2"
          >
            <Image className="w-4 h-4" />
            Clear Images
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog('all')}
            disabled={!!actionLoading || isLoadingAll}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Cache
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRebuildIndex}
            disabled={!!actionLoading || isLoadingAll}
            className="gap-2"
          >
            {actionLoading === 'rebuild' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Rebuild Index
          </Button>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={!!showClearDialog} onOpenChange={() => setShowClearDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showClearDialog === 'json' && 'Clear Card Data Cache'}
              {showClearDialog === 'images' && 'Clear Image Cache'}
              {showClearDialog === 'all' && 'Clear All Cache'}
            </DialogTitle>
            <DialogDescription>
              {showClearDialog === 'json' && (
                <>
                  This will delete all cached Scryfall card data ({stats?.jsonCacheCount ?? 0} cards, {formatBytes(stats?.jsonCacheSizeBytes ?? 0)}).
                  Card data will be re-fetched from Scryfall as needed.
                </>
              )}
              {showClearDialog === 'images' && (
                <>
                  This will delete all cached card images ({stats?.imageCacheCount ?? 0} images, {formatBytes(stats?.imageCacheSizeBytes ?? 0)}).
                  Images will be re-downloaded from Scryfall as needed.
                </>
              )}
              {showClearDialog === 'all' && (
                <>
                  This will delete all cached data ({formatBytes(stats?.totalSizeBytes ?? 0)}).
                  Both card data and images will be re-fetched from Scryfall as needed.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showClearDialog === 'json') handleClearJsonCache()
                else if (showClearDialog === 'images') handleClearImageCache()
                else if (showClearDialog === 'all') handleClearAllCache()
              }}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Clear Cache
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
