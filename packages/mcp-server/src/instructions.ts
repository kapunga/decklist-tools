import type { ListBundledSkillsResult } from './tools/skill-tools.js'

// ---------------------------------------------------------------------------
// Server `instructions`, sent once in the MCP `initialize` response and
// injected by clients into the model's context for the whole session.
//
// Every sentence about skills is conditional ("if available"): skills are
// installed by the Electron app, so the model must never block on, invoke, or
// guess at a skill it doesn't have. The tool guidance stands on its own.
// ---------------------------------------------------------------------------

const INSTALL_NUDGE =
  'If a skill is not in your list, do not try to invoke it and do not wait for it — the tools work without skills. ' +
  'Mention once that they ship with the MTG Deckbuilder app (Settings → Skills → Install all for Claude Code / Gemini CLI / Codex, ' +
  'or Export the zip for Claude Desktop → Capabilities), then proceed with the tools.'

const TOOL_GUIDANCE =
  'Card sets are `mainboard | sideboard | alternates | cut`; `deck_export` calls `alternates` "maybeboard". ' +
  'Start deck-analysis tasks with `deck_list`.'

function skillList(skills: ListBundledSkillsResult): string {
  return skills.skills.map(s => `\`${s.name}\``).join(', ')
}

function skillsSentence(skills: ListBundledSkillsResult): string {
  const base = 'Before any deck, list, or card-search task, load the matching mtg-deckbuilder skill **if it appears in your available skills**'
  if (!skills.skills_dir_configured || skills.skills.length === 0) return `${base}.`
  return `${base}. This server bundles: ${skillList(skills)}; \`list_bundled_skills\` shows descriptions and versions.`
}

export function buildInstructions(skills: ListBundledSkillsResult): string {
  return [skillsSentence(skills), INSTALL_NUDGE, TOOL_GUIDANCE].join(' ')
}
