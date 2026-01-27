import type { RoleDefinition } from '@/types'

export const SCRYFALL = {
  MIN_REQUEST_INTERVAL_MS: 100,
  IMPORT_DELAY_MS: 50,
} as const

export const AUTOCOMPLETE = {
  DEBOUNCE_MS: 300,
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 8,
} as const

export const IMPORT_PREVIEW = {
  MAX_CARDS_SHOWN: 15,
  MAX_CARDS_SHOWN_LARGE: 20,
  PROGRESS_UPDATE_INTERVAL: 5,
} as const

// Card type sort order for type-based grouping
export const CARD_TYPE_ORDER = [
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Land',
  'Other'
] as const

export const CARD_TYPE_SORT_ORDER: Record<string, number> = {
  Creature: 0,
  Planeswalker: 1,
  Battle: 2,
  Instant: 3,
  Sorcery: 4,
  Artifact: 5,
  Enchantment: 6,
  Land: 7,
  Other: 8
}

// Extract primary type from type line
export function getPrimaryType(typeLine: string): string {
  const lower = typeLine.toLowerCase()
  if (lower.includes('creature')) return 'Creature'
  if (lower.includes('planeswalker')) return 'Planeswalker'
  if (lower.includes('battle')) return 'Battle'
  if (lower.includes('instant')) return 'Instant'
  if (lower.includes('sorcery')) return 'Sorcery'
  if (lower.includes('artifact')) return 'Artifact'
  if (lower.includes('enchantment')) return 'Enchantment'
  if (lower.includes('land')) return 'Land'
  return 'Other'
}

export function getTypeSortOrder(typeLine: string): number {
  const primaryType = getPrimaryType(typeLine)
  return CARD_TYPE_SORT_ORDER[primaryType] ?? 8
}

// Default global roles - matches the Scala Taxonomy.default
export const DEFAULT_GLOBAL_ROLES: RoleDefinition[] = [
  // Special roles
  { id: 'engine', name: 'Engine', description: 'Essential to how the deck wins or functions', color: '#ec4899' },
  { id: 'theme', name: 'Theme', description: 'Fits the deck flavor or identity', color: '#a855f7' },

  // Core strategic roles
  { id: 'ramp', name: 'Ramp', description: 'Accelerates mana production', color: '#22c55e' },
  { id: 'card-draw', name: 'Card Draw', description: 'Draws additional cards', color: '#3b82f6' },
  { id: 'removal', name: 'Removal', description: 'Removes permanents from the battlefield', color: '#ef4444' },
  { id: 'board-wipe', name: 'Board Wipe', description: 'Mass removal of permanents', color: '#dc2626' },
  { id: 'tutor', name: 'Tutor', description: 'Searches library for specific cards', color: '#8b5cf6' },
  { id: 'protection', name: 'Protection', description: 'Protects permanents or players', color: '#f59e0b' },
  { id: 'recursion', name: 'Recursion', description: 'Returns cards from graveyard', color: '#10b981' },
  { id: 'finisher', name: 'Finisher', description: 'Wins the game or deals major damage', color: '#f97316' },
  { id: 'win-condition', name: 'Win Condition', description: 'Directly enables victory', color: '#eab308' },

  // Creature/combat roles
  { id: 'beater', name: 'Beater', description: 'Efficient creature for combat damage', color: '#84cc16' },
  { id: 'blocker', name: 'Blocker', description: 'Defensive creature', color: '#64748b' },
  { id: 'evasion', name: 'Evasion', description: 'Creature with evasive abilities', color: '#06b6d4' },
  { id: 'value-engine', name: 'Value Engine', description: 'Generates ongoing card advantage', color: '#a855f7' },
  { id: 'utility', name: 'Utility', description: 'Provides useful abilities', color: '#6366f1' },

  // Archetype-specific roles
  { id: 'token-producer', name: 'Token Producer', description: 'Creates creature tokens', color: '#14b8a6' },
  { id: 'sacrifice-fodder', name: 'Sacrifice Fodder', description: 'Meant to be sacrificed', color: '#71717a' },
  { id: 'sacrifice-outlet', name: 'Sacrifice Outlet', description: 'Lets you sacrifice creatures', color: '#525252' },
  { id: 'payoff', name: 'Payoff', description: 'Rewards deck strategy', color: '#f472b6' },
  { id: 'enabler', name: 'Enabler', description: 'Enables deck strategy', color: '#22d3ee' },
  { id: 'combo-piece', name: 'Combo Piece', description: 'Part of a game-winning combo', color: '#fbbf24' },

  // Mana
  { id: 'mana-fixer', name: 'Mana Fixer', description: 'Fixes mana colors', color: '#4ade80' },

  // Interaction
  { id: 'counterspell', name: 'Counterspell', description: 'Counters spells', color: '#60a5fa' },
  { id: 'discard', name: 'Discard', description: 'Forces opponents to discard', color: '#374151' },
  { id: 'stax', name: 'Stax', description: 'Slows opponents through taxes and restrictions', color: '#78716c' }
]

// Role color palette for custom roles without a defined color
export const ROLE_COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
] as const

// Get role color - uses role definition color if available, otherwise generates from palette
export function getRoleColor(roleId: string, globalRoles?: RoleDefinition[], customRoles?: RoleDefinition[]): string {
  // Check custom roles first
  const customRole = customRoles?.find(r => r.id === roleId)
  if (customRole?.color) return customRole.color

  // Check global roles (passed in or fallback to defaults)
  const globals = globalRoles && globalRoles.length > 0 ? globalRoles : DEFAULT_GLOBAL_ROLES
  const globalRole = globals.find(r => r.id === roleId)
  if (globalRole?.color) return globalRole.color

  // Hash role ID to pick from palette
  const hash = roleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return ROLE_COLOR_PALETTE[hash % ROLE_COLOR_PALETTE.length]
}

// Get role definition by ID from combined global and custom roles
export function getRoleById(roleId: string, globalRoles?: RoleDefinition[], customRoles?: RoleDefinition[]): RoleDefinition | undefined {
  const customRole = customRoles?.find(r => r.id === roleId)
  if (customRole) return customRole
  const globals = globalRoles && globalRoles.length > 0 ? globalRoles : DEFAULT_GLOBAL_ROLES
  return globals.find(r => r.id === roleId)
}

// Get all available roles (global + custom)
export function getAllRoles(globalRoles?: RoleDefinition[], customRoles?: RoleDefinition[]): RoleDefinition[] {
  const globals = globalRoles && globalRoles.length > 0 ? globalRoles : DEFAULT_GLOBAL_ROLES
  if (!customRoles || customRoles.length === 0) return globals
  // Combine, with custom roles taking precedence for same ID
  const customIds = new Set(customRoles.map(r => r.id))
  const filteredGlobal = globals.filter(r => !customIds.has(r.id))
  return [...customRoles, ...filteredGlobal]
}
