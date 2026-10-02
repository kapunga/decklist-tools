import { describe, it, expect } from 'vitest'
import { buildInstructions } from './instructions.js'

const withSkills = {
  skills_dir_configured: true,
  skills: [
    { name: 'mtg-deckbuilder-decks', description: '', version: '1' },
    { name: 'scryfall-search', description: '', version: '1' },
  ],
}

describe('buildInstructions', () => {
  it('names each bundled skill when a skills dir is configured', () => {
    const text = buildInstructions(withSkills)
    expect(text).toContain('`mtg-deckbuilder-decks`')
    expect(text).toContain('`scryfall-search`')
  })

  it('keeps the install nudge and tool guidance without a skills dir', () => {
    const text = buildInstructions({ skills_dir_configured: false, skills: [] })
    expect(text).toContain('Settings → Skills')
    expect(text).toContain('do not wait for it')
    expect(text).toContain('`deck_list`')
    expect(text).not.toContain('This server bundles')
  })

  it('conditions skill loading on availability', () => {
    expect(buildInstructions(withSkills)).toContain('if it appears in your available skills')
  })
})
