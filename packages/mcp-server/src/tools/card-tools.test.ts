import { describe, it, expect } from 'vitest'
import { looksLikeSearchSyntax } from './card-tools.js'

describe('looksLikeSearchSyntax', () => {
  it.each([
    't:instant c:red cmc<=1',
    '(t:instant',
    'froobinator:yes',
    '-t:land',
    't:land -is:basic',
    'cmc<<2',
    'pow>=4',
    'mv=3',
    'name:"Lightning Bolt"',
    '!"Lightning Bolt"',
    '"lightning bolt"',
    '(t:instant or t:sorcery)',
  ])('treats %j as search syntax', query => {
    expect(looksLikeSearchSyntax(query)).toBe(true)
  })

  it.each([
    'Lightning Bolt',
    'Jace, the Mind Sculptor',
    "Will-o'-the-Wisp",
    "Urza's Saga",
    'Fire // Ice',
    'Sephiroth',
    'Æther Vial',
    'She said "hi"',
    'Circle of Protection: Red',
  ])('treats %j as a card name', query => {
    expect(looksLikeSearchSyntax(query)).toBe(false)
  })
})
