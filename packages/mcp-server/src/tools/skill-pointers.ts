import type { Tool } from '@modelcontextprotocol/sdk/types.js'

// ---------------------------------------------------------------------------
// Per-tool skill pointers. Server-level `instructions` never reach subagents,
// which receive only tool schemas, so each tool description carries one short
// conditional sentence naming the bundled skill that covers it. The pointer is
// always emitted (even without `--skills-dir`): it is conditional on the
// *client's* available skills, which the server cannot see, and tools work
// without the skill. Mapping follows each skill's tool table in skills/.
// ---------------------------------------------------------------------------

const ANALYSIS = 'mtg-deckbuilder-analysis'
const DECKS = 'mtg-deckbuilder-decks'
const LISTS = 'mtg-deckbuilder-lists'
const LOOKUP = 'mtg-deckbuilder-lookup'

export const TOOL_SKILLS: Readonly<Record<string, string>> = {
  get_deck: ANALYSIS,
  deck_list: ANALYSIS,
  deck_curve: ANALYSIS,
  deck_notes: ANALYSIS,
  deck_pull_list: ANALYSIS,
  list_deck_notes: ANALYSIS,
  manage_deck_note: ANALYSIS,
  search_decks_for_card: ANALYSIS,
  list_decks: DECKS,
  manage_deck: DECKS,
  manage_card: DECKS,
  manage_commander: DECKS,
  list_roles: DECKS,
  manage_role: DECKS,
  deck_export: DECKS,
  list_card_lists: LISTS,
  get_card_list: LISTS,
  manage_card_list: LISTS,
  search_cards: LOOKUP,
  get_collection_filter: LOOKUP,
}

/** Tools with no matching skill (the skill inventory itself). */
export const SKILL_EXEMPT_TOOLS: readonly string[] = ['list_bundled_skills']

export const skillPointer = (skill: string): string =>
  `If the \`${skill}\` skill is in your available skills, load it before using this tool; otherwise proceed.`

export const withSkillPointer = (tool: Tool): Tool => {
  const skill = TOOL_SKILLS[tool.name]
  return skill === undefined
    ? tool
    : { ...tool, description: `${skillPointer(skill)} ${tool.description ?? ''}`.trim() }
}
