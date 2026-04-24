import { Sun, Moon, Check } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  THEME_MODE,
  defaultThemeForMode,
  themesForMode,
  type ThemeId,
  type ThemeMode,
  type ThemeMeta,
} from '@/lib/themes'

export function ThemeSettingsSection() {
  const theme = useStore(state => state.config?.theme) ?? 'library'
  const updateConfig = useStore(state => state.updateConfig)

  const currentMode = THEME_MODE[theme as ThemeId]
  const visibleThemes = themesForMode(currentMode)

  const selectTheme = (next: ThemeId) => {
    if (next === theme) return
    updateConfig({ theme: next })
  }

  const selectMode = (mode: ThemeMode) => {
    if (mode === currentMode) return
    updateConfig({ theme: defaultThemeForMode(mode) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pick a visual theme. Light and dark themes are grouped — toggle the mode to see the other set.
        </p>
        <ModeToggle current={currentMode} onChange={selectMode} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleThemes.map(meta => (
          <ThemeCard
            key={meta.id}
            meta={meta}
            selected={meta.id === theme}
            onSelect={() => selectTheme(meta.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ModeToggle({
  current,
  onChange,
}: {
  current: ThemeMode
  onChange: (mode: ThemeMode) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-md">
      <Button
        size="sm"
        variant={current === 'light' ? 'default' : 'ghost'}
        onClick={() => onChange('light')}
        className="h-7 gap-1.5 px-3"
      >
        <Sun className="w-3.5 h-3.5" />
        Light
      </Button>
      <Button
        size="sm"
        variant={current === 'dark' ? 'default' : 'ghost'}
        onClick={() => onChange('dark')}
        className="h-7 gap-1.5 px-3"
      >
        <Moon className="w-3.5 h-3.5" />
        Dark
      </Button>
    </div>
  )
}

function ThemeCard({
  meta,
  selected,
  onSelect,
}: {
  meta: ThemeMeta
  selected: boolean
  onSelect: () => void
}) {
  const { canvas, ink, w, u, b, r, g, m, c } = meta.preview
  const swatches = [w, u, b, r, g, m, c]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative text-left rounded-lg border overflow-hidden transition-all',
        selected
          ? 'border-primary ring-2 ring-ring ring-offset-2 ring-offset-background'
          : 'border-border hover:border-primary/40',
      )}
      aria-pressed={selected}
    >
      {/* Preview canvas with mini WUBRG swatch strip */}
      <div
        className="p-4 border-b border-border"
        style={{ backgroundColor: canvas }}
      >
        <div
          className="text-xs font-semibold tracking-wide mb-2"
          style={{ color: ink, fontFamily: "'Cinzel', serif", letterSpacing: '0.04em' }}
        >
          {meta.name.toUpperCase()}
        </div>
        <div className="flex w-full h-5 rounded overflow-hidden" style={{ border: `1px solid ${ink}20` }}>
          {swatches.map((hex, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
          ))}
        </div>
      </div>
      {/* Name + tagline */}
      <div className="p-3 flex items-start justify-between gap-2 bg-card">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{meta.name}</div>
          <div className="text-xs text-muted-foreground truncate">{meta.tagline}</div>
        </div>
        {selected && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>
    </button>
  )
}
