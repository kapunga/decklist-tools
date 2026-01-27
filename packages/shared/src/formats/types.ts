import type { Deck } from '../types/index.js'

export interface ParsedCard {
  name: string
  setCode?: string
  collectorNumber?: string
  quantity: number
  isSideboard: boolean
  isMaybeboard: boolean
  isCommander: boolean
  roles: string[]
}

export interface DeckExportFormat {
  id: string
  name: string
  description: string
  parse: (text: string) => ParsedCard[]
  render: (deck: Deck, options: RenderOptions) => string
}

export interface RenderOptions {
  includeMaybeboard?: boolean
  includeSideboard?: boolean
}
