import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { getToolDefinitions } from './index.js'
import { TOOL_SKILLS, SKILL_EXEMPT_TOOLS, skillPointer, withSkillPointer } from './skill-pointers.js'

const SKILLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../skills')
const bundledSkills = fs.readdirSync(SKILLS_DIR)

describe('skill pointers in tool descriptions', () => {
  const tools = getToolDefinitions()

  it('every registered tool has a pointer or is explicitly exempt', () => {
    for (const tool of tools) {
      const exempt = SKILL_EXEMPT_TOOLS.includes(tool.name)
      const mapped = tool.name in TOOL_SKILLS
      expect(exempt !== mapped, `${tool.name} must be mapped xor exempt`).toBe(true)
      if (mapped) expect(tool.description).toContain(skillPointer(TOOL_SKILLS[tool.name]))
      else expect(tool.description).not.toContain('skill is in your available skills')
    }
  })

  it('maps and exemptions name no unknown tools', () => {
    const names = new Set(tools.map(t => t.name))
    for (const n of [...Object.keys(TOOL_SKILLS), ...SKILL_EXEMPT_TOOLS]) expect(names.has(n)).toBe(true)
  })

  it('every named skill exists in the bundled skills', () => {
    for (const skill of Object.values(TOOL_SKILLS)) expect(bundledSkills).toContain(skill)
  })

  it('pointer is conditional and short', () => {
    const p = skillPointer('mtg-deckbuilder-analysis')
    expect(p).toContain('If the `mtg-deckbuilder-analysis` skill is in your available skills')
    expect(p).toContain('otherwise proceed')
    expect(p.length).toBeLessThan(140)
  })

  it('withSkillPointer leaves exempt tools alone and keeps existing text', () => {
    const base = { name: 'list_bundled_skills', description: 'x', inputSchema: { type: 'object' as const } }
    expect(withSkillPointer(base)).toEqual(base)
    const mapped = withSkillPointer({ ...base, name: 'deck_list', description: 'Show it.' })
    expect(mapped.description?.startsWith('Show it. ')).toBe(true)
  })
})
