import fs from 'fs'
import path from 'path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

// ---------------------------------------------------------------------------
// MCP client config read/merge/write
//
// Each assistant stores its MCP server list in a config file we have to merge
// into without disturbing whatever else lives there. The three original clients
// (Claude Desktop / Claude Code / Gemini CLI) use JSON with a top-level
// `mcpServers` object; OpenAI Codex uses TOML with `[mcp_servers.<name>]`
// tables, and that same file also holds the user's `model`, `model_providers`,
// `projects`, `tui`, etc.
//
// The merge logic is identical across formats — only the (de)serializer and the
// servers key differ. The mutating-looking operations below are pure (they
// return new objects), so "don't clobber the user's other config" is a property
// we can assert directly in unit tests.
// ---------------------------------------------------------------------------

export type McpConfigFormat = 'json' | 'toml'

export type McpConfig = Record<string, unknown>

/** A single MCP server entry as written into the config file. */
export interface McpServerDef {
  command: string
  args: string[]
  env?: Record<string, string>
}

export function parseConfig(format: McpConfigFormat, text: string): McpConfig {
  return (format === 'toml' ? parseToml(text) : JSON.parse(text)) as McpConfig
}

export function serializeConfig(format: McpConfigFormat, config: McpConfig): string {
  return format === 'toml' ? stringifyToml(config) : JSON.stringify(config, null, 2)
}

/** Read + parse a config file, or `null` if it's missing or unreadable. */
export function readConfig(format: McpConfigFormat, configPath: string): McpConfig | null {
  try {
    if (!fs.existsSync(configPath)) return null
    return parseConfig(format, fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return null
  }
}

/** Serialize + write a config file, creating parent directories as needed. */
export function writeConfig(format: McpConfigFormat, configPath: string, config: McpConfig): void {
  const dir = path.dirname(configPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(configPath, serializeConfig(format, config))
}

function readServers(config: McpConfig, serversKey: string): Record<string, unknown> {
  const existing = config[serversKey]
  return existing && typeof existing === 'object'
    ? (existing as Record<string, unknown>)
    : {}
}

/**
 * Return a copy of `config` with `name` set under `serversKey` to `def`,
 * leaving every other top-level key and every other server entry untouched.
 * Pure — the input is never mutated.
 */
export function upsertMcpServer(
  config: McpConfig,
  serversKey: string,
  name: string,
  def: McpServerDef,
): McpConfig {
  const servers = { ...readServers(config, serversKey), [name]: def }
  return { ...config, [serversKey]: servers }
}

/** Return a copy of `config` with `name` removed from `serversKey`. */
export function removeMcpServer(
  config: McpConfig,
  serversKey: string,
  name: string,
): McpConfig {
  const servers = { ...readServers(config, serversKey) }
  delete servers[name]
  return { ...config, [serversKey]: servers }
}

/** Whether `serversKey` already contains an entry named `name`. */
export function hasMcpServer(config: McpConfig, serversKey: string, name: string): boolean {
  return name in readServers(config, serversKey)
}
