<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Asset {
  name: string
  browser_download_url: string
  platform: 'mac' | 'win' | 'linux'
  arch: 'arm64' | 'x64'
}

interface Release {
  tag_name: string
  html_url: string
  assets: Asset[]
}

const REPO = 'kapunga/decklist-tools'
// Bumped to :v2 so any release cached under the old key — which is how a stale
// version (e.g. an old 0.11.0) could stick around — is abandoned, never shown.
const CACHE_KEY = 'mtg-deckbuilder-latest-release:v2'
const LEGACY_CACHE_KEY = 'mtg-deckbuilder-latest-release'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const release = ref<Release | null>(null)
const error = ref(false)

function parseAsset(raw: { name: string; browser_download_url: string }): Asset | null {
  const name = raw.name.toLowerCase()
  let platform: Asset['platform'] | null = null
  let arch: Asset['arch'] = 'x64'

  if (name.endsWith('.dmg')) platform = 'mac'
  else if (name.endsWith('.exe') || name.endsWith('.msi')) platform = 'win'
  else if (name.endsWith('.appimage') || name.endsWith('.deb')) platform = 'linux'
  else return null

  if (name.includes('arm64') || name.includes('aarch64')) arch = 'arm64'

  return { name: raw.name, browser_download_url: raw.browser_download_url, platform, arch }
}

function isAppleSilicon(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return true
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
    return renderer.includes('Apple') && !renderer.includes('Apple GPU')
  } catch {
    return true
  }
}

function detectPlatform(): { platform: Asset['platform']; arch: Asset['arch'] } {
  const ua = navigator.userAgent.toLowerCase()
  const plat = navigator.platform?.toLowerCase() ?? ''

  let platform: Asset['platform'] = 'linux'
  if (ua.includes('mac') || plat.includes('mac')) platform = 'mac'
  else if (ua.includes('win') || plat.includes('win')) platform = 'win'

  let arch: Asset['arch'] = 'x64'
  if (ua.includes('arm64') || ua.includes('aarch64') || plat.includes('arm')) arch = 'arm64'
  else if (platform === 'mac' && isAppleSilicon()) arch = 'arm64'

  return { platform, arch }
}

const userPlatform = ref<{ platform: Asset['platform']; arch: Asset['arch'] }>({ platform: 'linux', arch: 'x64' })

const primaryAsset = computed(() => {
  if (!release.value) return null
  const { platform, arch } = userPlatform.value
  return release.value.assets.find(a => a.platform === platform && a.arch === arch)
    ?? release.value.assets.find(a => a.platform === platform)
    ?? null
})

const otherAssets = computed(() => {
  if (!release.value || !primaryAsset.value) return release.value?.assets ?? []
  return release.value.assets.filter(a => a.browser_download_url !== primaryAsset.value!.browser_download_url)
})

const version = computed(() => release.value?.tag_name ?? '')

const platformLabel = computed(() => {
  const { platform, arch } = userPlatform.value
  if (platform === 'mac') return arch === 'arm64' ? 'macOS (Apple Silicon)' : 'macOS (Intel)'
  const labels: Record<string, string> = { win: 'Windows', linux: 'Linux' }
  return labels[platform] ?? 'your platform'
})

function assetLabel(asset: Asset): string {
  const labels: Record<string, string> = { mac: 'macOS', win: 'Windows', linux: 'Linux' }
  const archLabel = asset.arch === 'arm64' ? ' (Apple Silicon)' : asset.arch === 'x64' ? ' (Intel)' : ''
  return `${labels[asset.platform]}${archLabel}`
}

interface CachedRelease {
  release: Release
  fetchedAt: number
}

async function fetchLatest(): Promise<Release | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const assets = data.assets.map(parseAsset).filter(Boolean) as Asset[]
    return { tag_name: data.tag_name, html_url: data.html_url, assets }
  } catch {
    return null
  }
}

onMounted(async () => {
  userPlatform.value = detectPlatform()

  // Purge the legacy (un-versioned, never-expiring) cache so a value stored
  // under it can never resurface.
  try {
    sessionStorage.removeItem(LEGACY_CACHE_KEY)
    localStorage.removeItem(LEGACY_CACHE_KEY)
  } catch { /* storage unavailable — non-fatal */ }

  // Show a recent cache immediately for a fast first paint, but only if it's
  // still fresh. The fetch below always runs regardless, so even a shown cache
  // gets corrected to the real latest release a moment later.
  let shownFromCache = false
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as CachedRelease
      if (cached?.release && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        release.value = cached.release
        shownFromCache = true
      }
    }
  } catch { /* ignore malformed cache */ }

  // Always revalidate against GitHub. This is what guarantees the displayed
  // version is the real latest, not whatever happened to be cached.
  const latest = await fetchLatest()
  if (latest) {
    release.value = latest
    error.value = false
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ release: latest, fetchedAt: Date.now() }))
    } catch { /* storage full/unavailable — non-fatal */ }
  } else if (!shownFromCache) {
    // Only fall back to the error state if we have nothing at all to show.
    error.value = true
  }
})
</script>

<template>
  <div class="download-button">
    <template v-if="primaryAsset">
      <a :href="primaryAsset.browser_download_url" class="primary-btn">
        Download for {{ platformLabel }} ({{ version }})
      </a>
      <div class="secondary-links">
        <template v-if="otherAssets.length">
          <span v-for="asset in otherAssets" :key="asset.name">
            <a :href="asset.browser_download_url">{{ assetLabel(asset) }}</a>
          </span>
          <span class="separator">·</span>
        </template>
        <a :href="release!.html_url">All releases</a>
      </div>
    </template>

    <template v-else-if="release && !primaryAsset">
      <a :href="release.html_url" class="primary-btn">
        Download {{ version }}
      </a>
      <div class="secondary-links">
        <a v-for="asset in release.assets" :key="asset.name" :href="asset.browser_download_url">
          {{ assetLabel(asset) }}
        </a>
      </div>
    </template>

    <template v-else-if="error">
      <a :href="`https://github.com/${REPO}/releases`" class="primary-btn">
        Download from GitHub
      </a>
    </template>

    <template v-else>
      <span class="loading">Loading...</span>
    </template>
  </div>
</template>

<style scoped>
.download-button {
  text-align: center;
  margin: 1.5rem 0;
}

.primary-btn {
  display: inline-block;
  padding: 0.85rem 1.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-button-brand-text);
  background-color: var(--vp-button-brand-bg);
  border-radius: 0;
  text-decoration: none;
  transition: background-color 0.25s;
}

.primary-btn:hover {
  background-color: var(--vp-button-brand-hover-bg);
  color: var(--vp-button-brand-text);
  text-decoration: none;
}

.secondary-links {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.secondary-links a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.secondary-links a:hover {
  text-decoration: underline;
}

.secondary-links span + span::before {
  content: ' · ';
  color: var(--vp-c-text-3);
}

.separator {
  color: var(--vp-c-text-3);
}

.loading {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
</style>
