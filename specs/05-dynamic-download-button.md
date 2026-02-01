# Dynamic Download Button for Docs Site

## Goal

Add a download button to the VitePress docs site that auto-detects the user's OS/architecture and links to the correct release asset from GitHub Releases.

## Current State

- Only macOS ARM64 `.dmg` is built (via `build-app.yml` on `v*` tags)
- `docs/installation.md` has a static link to the GitHub Releases page
- `docs/index.md` hero links to the installation page

## Design

### Component: `DownloadButton.vue`

A Vue component registered in the VitePress theme that:

1. **Fetches** `https://api.github.com/repos/kapunga/decklist-tools/releases/latest` on mount
2. **Parses** release assets by filename pattern:
   - `.dmg` → macOS
   - `.exe` / `.msi` → Windows
   - `.AppImage` / `.deb` → Linux
   - ARM vs x64 inferred from filename (e.g. `arm64`, `x64`)
3. **Detects** user platform from `navigator.userAgent` / `navigator.platform`
4. **Renders** a primary download button for the detected platform with version, plus secondary links

```
┌──────────────────────────────────┐
│  ⬇ Download for macOS (v0.2.0)  │
│                                  │
│  Other platforms · All releases  │
└──────────────────────────────────┘
```

**Fallback:** If the API call fails or no asset matches, show a generic "Download from GitHub" link to the releases page.

### Theme Extension: `docs/.vitepress/theme/index.ts`

Extend the default VitePress theme to register `DownloadButton` globally:

```ts
import DefaultTheme from 'vitepress/theme'
import DownloadButton from '../components/DownloadButton.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DownloadButton', DownloadButton)
  }
}
```

### Page Changes

- **`docs/index.md`** — Add `<DownloadButton />` below the hero frontmatter
- **`docs/installation.md`** — Replace static download instruction with `<DownloadButton />`, keep a plain-text fallback link below

## Files to Create

| File | Action |
|------|--------|
| `docs/.vitepress/components/DownloadButton.vue` | Create |
| `docs/.vitepress/theme/index.ts` | Create |
| `docs/index.md` | Modify |
| `docs/installation.md` | Modify |

## Future Considerations

- When Windows/Linux builds are added to `build-app.yml`, the component will pick them up automatically from the release assets
- Consider caching the API response in `sessionStorage` to avoid re-fetching on page navigation
- GitHub API rate limit for unauthenticated requests is 60/hr — sufficient for a docs site
