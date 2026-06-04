import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  parseConfig,
  serializeConfig,
  readConfig,
  writeConfig,
  upsertMcpServer,
  removeMcpServer,
  hasMcpServer,
  type McpServerDef,
} from './mcp-config'

// A realistic ~/.codex/config.toml: a model, a custom Ollama provider, a
// trusted-project entry (quoted dotted-path key) and a TUI section with a
// quoted version key. The whole point of the merge is that connecting an MCP
// server leaves ALL of this untouched.
const CODEX_CONFIG = `model = "gpt-5.4-mini"
model_reasoning_effort = "low"

[tools]
web_search = true

[model_providers.ollama-launch]
name = "Ollama"
base_url = "http://127.0.0.1:11434/v1/"
wire_api = "responses"

[projects."/Users/kapunga/code/project-mud"]
trust_level = "trusted"

[tui.model_availability_nux]
"gpt-5.5" = 1
`

const DEF: McpServerDef = {
  command: '/opt/homebrew/bin/node',
  args: [
    '/Applications/MTG Deckbuilder.app/Contents/Resources/mcp-server/main.js',
    '--skills-dir',
    '/Applications/MTG Deckbuilder.app/Contents/Resources/skills',
  ],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const at = (config: unknown, ...keys: string[]): any =>
  keys.reduce<any>((acc, k) => (acc == null ? acc : acc[k]), config)

describe('mcp-config — TOML merge (Codex)', () => {
  it('upsert adds the server without clobbering other sections', () => {
    const before = parseConfig('toml', CODEX_CONFIG)
    const after = upsertMcpServer(before, 'mcp_servers', 'mtg-deckbuilder', DEF)
    // round-trip through serialize so we exercise the on-disk shape, not just the object
    const rt = parseConfig('toml', serializeConfig('toml', after))

    // everything that was there is still there
    expect(rt.model).toBe('gpt-5.4-mini')
    expect(rt.model_reasoning_effort).toBe('low')
    expect(at(rt, 'tools', 'web_search')).toBe(true)
    expect(at(rt, 'model_providers', 'ollama-launch', 'base_url')).toBe('http://127.0.0.1:11434/v1/')
    expect(at(rt, 'projects', '/Users/kapunga/code/project-mud', 'trust_level')).toBe('trusted')
    expect(at(rt, 'tui', 'model_availability_nux', 'gpt-5.5')).toBe(1)

    // and the server is present and correct
    expect(at(rt, 'mcp_servers', 'mtg-deckbuilder', 'command')).toBe(DEF.command)
    expect(at(rt, 'mcp_servers', 'mtg-deckbuilder', 'args')).toEqual(DEF.args)
  })

  it('does not mutate the input config', () => {
    const before = parseConfig('toml', CODEX_CONFIG)
    upsertMcpServer(before, 'mcp_servers', 'mtg-deckbuilder', DEF)
    expect(before.mcp_servers).toBeUndefined()
  })

  it('is idempotent and replaces an existing entry in place', () => {
    const base = upsertMcpServer(parseConfig('toml', CODEX_CONFIG), 'mcp_servers', 'mtg-deckbuilder', DEF)
    const updated = upsertMcpServer(base, 'mcp_servers', 'mtg-deckbuilder', { command: 'node', args: ['x'] })
    expect(Object.keys(at(updated, 'mcp_servers'))).toEqual(['mtg-deckbuilder'])
    expect(at(updated, 'mcp_servers', 'mtg-deckbuilder', 'command')).toBe('node')
  })

  it('preserves sibling mcp_servers entries', () => {
    const withOther = upsertMcpServer(parseConfig('toml', CODEX_CONFIG), 'mcp_servers', 'other', { command: 'foo', args: [] })
    const both = upsertMcpServer(withOther, 'mcp_servers', 'mtg-deckbuilder', DEF)
    expect(Object.keys(at(both, 'mcp_servers')).sort()).toEqual(['mtg-deckbuilder', 'other'])
  })

  it('remove deletes only the named server, leaving the rest intact', () => {
    const withTwo = upsertMcpServer(
      upsertMcpServer(parseConfig('toml', CODEX_CONFIG), 'mcp_servers', 'other', { command: 'foo', args: [] }),
      'mcp_servers',
      'mtg-deckbuilder',
      DEF,
    )
    const removed = removeMcpServer(withTwo, 'mcp_servers', 'mtg-deckbuilder')
    expect(hasMcpServer(removed, 'mcp_servers', 'mtg-deckbuilder')).toBe(false)
    expect(hasMcpServer(removed, 'mcp_servers', 'other')).toBe(true)
    // surrounding config survives a remove + serialize round-trip
    const rt = parseConfig('toml', serializeConfig('toml', removed))
    expect(rt.model).toBe('gpt-5.4-mini')
    expect(at(rt, 'model_providers', 'ollama-launch', 'name')).toBe('Ollama')
  })

  it('hasMcpServer reflects presence', () => {
    const cfg = parseConfig('toml', CODEX_CONFIG)
    expect(hasMcpServer(cfg, 'mcp_servers', 'mtg-deckbuilder')).toBe(false)
    const seeded = upsertMcpServer(cfg, 'mcp_servers', 'mtg-deckbuilder', DEF)
    expect(hasMcpServer(seeded, 'mcp_servers', 'mtg-deckbuilder')).toBe(true)
  })

  it('round-trips the config structurally (quoted keys survive)', () => {
    const once = parseConfig('toml', CODEX_CONFIG)
    const twice = parseConfig('toml', serializeConfig('toml', once))
    expect(twice).toEqual(once)
  })
})

describe('mcp-config — JSON path (existing clients unchanged)', () => {
  const JSON_CONFIG = JSON.stringify({
    globalShortcut: '',
    mcpServers: { filesystem: { command: 'npx', args: ['-y', 'x'] } },
    preferences: { a: 1 },
  })

  it('upsert adds under mcpServers without touching other top-level keys', () => {
    const after = upsertMcpServer(parseConfig('json', JSON_CONFIG), 'mcpServers', 'mtg-deckbuilder', DEF)
    expect(after.globalShortcut).toBe('')
    expect(at(after, 'preferences', 'a')).toBe(1)
    expect(at(after, 'mcpServers', 'filesystem', 'command')).toBe('npx')
    expect(at(after, 'mcpServers', 'mtg-deckbuilder', 'args')).toEqual(DEF.args)
  })

  it('remove deletes only the named server', () => {
    const seeded = upsertMcpServer(parseConfig('json', JSON_CONFIG), 'mcpServers', 'mtg-deckbuilder', DEF)
    const removed = removeMcpServer(seeded, 'mcpServers', 'mtg-deckbuilder')
    expect(hasMcpServer(removed, 'mcpServers', 'mtg-deckbuilder')).toBe(false)
    expect(hasMcpServer(removed, 'mcpServers', 'filesystem')).toBe(true)
  })
})

describe('mcp-config — file IO', () => {
  it('writeConfig creates parent dirs and round-trips through readConfig', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-config-'))
    try {
      const file = path.join(dir, 'nested', 'config.toml')
      const cfg = upsertMcpServer(parseConfig('toml', CODEX_CONFIG), 'mcp_servers', 'mtg-deckbuilder', DEF)
      writeConfig('toml', file, cfg)
      expect(fs.existsSync(file)).toBe(true)
      const read = readConfig('toml', file)
      expect(at(read, 'mcp_servers', 'mtg-deckbuilder', 'command')).toBe(DEF.command)
      expect(read?.model).toBe('gpt-5.4-mini')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('readConfig returns null for a missing file', () => {
    expect(readConfig('toml', '/no/such/file.toml')).toBeNull()
  })
})
