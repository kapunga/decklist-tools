import { THEME_MODE, LIGHT_THEMES, DARK_THEMES } from '@/types'
import type { ThemeId, ThemeMode } from '@/types'

export { THEME_MODE, LIGHT_THEMES, DARK_THEMES }
export type { ThemeId, ThemeMode }

export interface ThemeMeta {
  id: ThemeId
  name: string
  tagline: string
  blurb: string
  mode: ThemeMode
  /** Preview swatches: [canvas, ink/accent-foreground, W, U, B, R, G, M, C]. */
  preview: {
    canvas: string
    ink: string
    w: string
    u: string
    b: string
    r: string
    g: string
    m: string
    c: string
  }
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  library: {
    id: 'library',
    name: 'Strixhaven',
    tagline: 'Editorial',
    blurb: "Warm off-white with a muted terracotta accent. Quiet, confident, restrained — the curator's catalog.",
    mode: 'light',
    preview: {
      canvas: '#F7F2EA', ink: '#1C1915',
      w: '#E8DDBF', u: '#5B7A95', b: '#3B2E2B', r: '#B8513F', g: '#6E7F4C', m: '#B69349', c: '#B4ABA0',
    },
  },
  fantasy: {
    id: 'fantasy',
    name: 'Dominaria',
    tagline: 'Grimoire',
    blurb: 'Parchment and oxblood. Thick serifs and tea-stain neutrals — a leather-bound spellbook.',
    mode: 'light',
    preview: {
      canvas: '#EFE4C8', ink: '#2A1B0E',
      w: '#D9C98B', u: '#3E5A7D', b: '#2B1B2D', r: '#7A1F1A', g: '#385432', m: '#B89447', c: '#96887A',
    },
  },
  steampunk: {
    id: 'steampunk',
    name: 'Kaladesh',
    tagline: 'Drafting Table',
    blurb: "Drafting-paper cream with aged brass. High-contrast serif and mono data — an engineer's ledger.",
    mode: 'light',
    preview: {
      canvas: '#EAE2D0', ink: '#1A1611',
      w: '#E3D9B3', u: '#33546B', b: '#221C13', r: '#8E3A28', g: '#4A5F33', m: '#A0691C', c: '#8B7E66',
    },
  },
  ukiyoe: {
    id: 'ukiyoe',
    name: 'Kamigawa',
    tagline: 'Woodblock',
    blurb: 'Washi cream and sumi ink. Muted indigo and vermillion seal — east-Asian restraint, modern bones.',
    mode: 'light',
    preview: {
      canvas: '#F0EADB', ink: '#1A1918',
      w: '#EFE3C6', u: '#324E6E', b: '#1C1522', r: '#B03A2E', g: '#3F5A3E', m: '#B08D2B', c: '#9C9186',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neo Kamigawa',
    tagline: 'Dataslate',
    blurb: 'Black with a blue cast and one hot accent. Grotesque display, mono data — a terminal readout.',
    mode: 'dark',
    preview: {
      canvas: '#0B0E14', ink: '#E8ECF5',
      w: '#EAF8FF', u: '#00E5FF', b: '#1F2330', r: '#D23F7C', g: '#39FF14', m: '#FFED47', c: '#A4B2C4',
    },
  },
  gothic: {
    id: 'gothic',
    name: 'Innistrad',
    tagline: 'Candlelight',
    blurb: 'Candle-bone on dried-ink black. Italic serifs and garnet — forbidden book, midnight.',
    mode: 'dark',
    preview: {
      canvas: '#14100F', ink: '#E8DFD4',
      w: '#D4C7B8', u: '#2A3E5A', b: '#1E1014', r: '#7A1F2B', g: '#2E4A33', m: '#8E7239', c: '#6B5F57',
    },
  },
}

export const DEFAULT_LIGHT_THEME: ThemeId = 'library'
export const DEFAULT_DARK_THEME: ThemeId = 'gothic'

export function defaultThemeForMode(mode: ThemeMode): ThemeId {
  return mode === 'light' ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME
}

export function themesForMode(mode: ThemeMode): ThemeMeta[] {
  const ids = mode === 'light' ? LIGHT_THEMES : DARK_THEMES
  return ids.map(id => THEMES[id])
}
