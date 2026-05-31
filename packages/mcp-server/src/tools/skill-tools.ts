import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Bundled-skill inventory exposed via the `list_bundled_skills` tool.
//
// The Electron app passes `--skills-dir <path>` when it spawns this MCP
// server so the tool can read the same SKILL.md files the Settings → Skills
// table installs from. Clients (and any installed SKILL.md the user has on
// disk) can call this tool to compare their local copy's `metadata.version`
// against what the app currently bundles.
// ---------------------------------------------------------------------------

export interface BundledSkillSummary {
  name: string
  description: string
  version: string
}

/**
 * Result shape. `skills_dir_configured: false` is the signal the server
 * wasn't given a `--skills-dir` — e.g. someone connected the MCP server
 * standalone instead of through the Electron app. Surface that so the
 * caller doesn't mistake "no skills" for "no skills directory."
 */
export interface ListBundledSkillsResult {
  skills_dir_configured: boolean
  skills: BundledSkillSummary[]
}

interface SkillFrontmatter {
  top: Record<string, string>
  metadata: Record<string, string>
}

/**
 * Parse a `---`-delimited YAML head, recognising the `metadata:` block as
 * one level of indented children. Quoted string values have their wrapping
 * quotes stripped. Mirrors the parser in
 * `packages/electron-app/electron/skills.ts` — duplicated rather than
 * promoted to `shared` because the parser uses Node's `fs`.
 */
function parseSkillFrontmatter(filePath: string): SkillFrontmatter {
  const empty: SkillFrontmatter = { top: {}, metadata: {} }
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(4096)
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0)
    fs.closeSync(fd)
    const head = buf.toString('utf-8', 0, bytesRead)
    const lines = head.split('\n')
    if (lines[0]?.trim() !== '---') return empty
    const out: SkillFrontmatter = { top: {}, metadata: {} }
    let inMetadata = false
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '---') break
      const topMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (topMatch) {
        const [, key, rawValue] = topMatch
        const value = unquote(rawValue.trim())
        if (key === 'metadata' && value === '') {
          inMetadata = true
        } else {
          inMetadata = false
          out.top[key] = value
        }
        continue
      }
      if (inMetadata) {
        const nested = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/)
        if (nested) out.metadata[nested[1]] = unquote(nested[2].trim())
      }
    }
    return out
  } catch {
    return empty
  }
}

function unquote(s: string): string {
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    return s.slice(1, -1)
  }
  return s
}

export function listBundledSkills(skillsDir: string | undefined): ListBundledSkillsResult {
  if (!skillsDir || !fs.existsSync(skillsDir)) {
    return { skills_dir_configured: false, skills: [] }
  }
  const skills: BundledSkillSummary[] = []
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillMd = path.join(skillsDir, entry.name, 'SKILL.md')
    if (!fs.existsSync(skillMd)) continue
    const fm = parseSkillFrontmatter(skillMd)
    skills.push({
      name: entry.name,
      description: fm.top.description ?? '',
      version: fm.metadata.version ?? '',
    })
  }
  skills.sort((a, b) => a.name.localeCompare(b.name))
  return { skills_dir_configured: true, skills }
}
