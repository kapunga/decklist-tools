import { app, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Clients we can install skills into. Mirrors `McpClientId` in main.ts. */
export type SkillClientId = 'claude-desktop' | 'claude-code' | 'gemini-cli'

/**
 * How a client receives skills.
 *
 * - `directory`: skills are dropped into a known filesystem path
 *   (Claude Code → ~/.claude/skills/, Gemini CLI → ~/.gemini/skills/).
 *   Install = copy in, uninstall = remove + drop manifest record.
 *
 * - `manual`: no documented filesystem path (Claude Desktop). Install =
 *   export each skill as a .zip via the OS save dialog so the user can
 *   upload it through the app's Capabilities UI. There's nothing on disk
 *   to track, so manual targets do not write manifest records.
 */
export type SkillTargetKind = 'directory' | 'manual'

export type SkillTarget =
  | { kind: 'directory'; clientId: SkillClientId; skillsDir: string }
  | { kind: 'manual'; clientId: SkillClientId }

/** Per-skill record persisted to `<storageDir>/skills-installed.json`. */
export interface InstalledSkillRecord {
  client: SkillClientId
  skillName: string
  installedVersion: string // value of app.getVersion() at install time
  installedAt: string // ISO timestamp
}

export interface SkillsManifest {
  records: InstalledSkillRecord[]
}

/** A skill bundled with the app. */
export interface BundledSkill {
  name: string
  /** Absolute path to the source directory (e.g. <repo>/skills/<name>). */
  sourcePath: string
}

export type SkillInstallStatus =
  | 'not-installed'
  | 'installed'
  | 'installed-stale' // installed at an older app version than current

export interface SkillListEntry {
  name: string
  status: SkillInstallStatus
  installedVersion?: string
  bundledVersion: string // currently always app.getVersion()
}

export interface InstallResult {
  success: boolean
  /** True only for the manual-export path when the user cancels the dialog. */
  cancelled?: boolean
  error?: string
}

export interface BulkResult {
  success: boolean
  errors?: Array<{ skillName: string; error: string }>
}

// ---------------------------------------------------------------------------
// Module factory
// ---------------------------------------------------------------------------

export interface SkillsModuleConfig {
  /** Repo root (used in dev to locate the source `skills/` dir). */
  repoRoot: string
  /** User storage dir — where the manifest is persisted. */
  storageDir: string
}

export interface SkillsModule {
  // Read
  listBundledSkills(): BundledSkill[]
  getSkillTarget(clientId: SkillClientId): SkillTarget
  listSkillsForClient(clientId: SkillClientId): SkillListEntry[]
  readManifest(): SkillsManifest

  // Mutate (directory targets)
  installSkill(clientId: SkillClientId, skillName: string): Promise<InstallResult>
  uninstallSkill(clientId: SkillClientId, skillName: string): InstallResult
  installAll(clientId: SkillClientId): Promise<BulkResult>
  uninstallAll(clientId: SkillClientId): BulkResult

  // Mutate (manual targets — export-as-zip via save dialog)
  exportSkillAsZip(skillName: string): Promise<InstallResult>

  // Wire IPC
  registerHandlers(clientId: SkillClientId): void
}

// ---------------------------------------------------------------------------
// Path resolution (free helpers — pure given inputs)
// ---------------------------------------------------------------------------

/**
 * Where the app's bundled skills live. In dev, the repo's `skills/` dir;
 * in production, `process.resourcesPath/skills/`. Mirrors `getMcpServerPath()`.
 */
export function getBundledSkillsDir(repoRoot: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'skills')
    : path.join(repoRoot, 'skills')
}

/**
 * Resolve the target skills directory (or 'manual') for a client. In dev
 * mode the two directory targets resolve to `<repoRoot>/dev-skills/<clientId>/`
 * to avoid touching real Claude/Gemini installs.
 */
export function resolveSkillTarget(clientId: SkillClientId, repoRoot: string): SkillTarget {
  if (clientId === 'claude-desktop') {
    return { kind: 'manual', clientId }
  }
  if (!app.isPackaged) {
    return {
      kind: 'directory',
      clientId,
      skillsDir: path.join(repoRoot, 'dev-skills', clientId),
    }
  }
  const home = app.getPath('home')
  const skillsDir =
    clientId === 'claude-code'
      ? path.join(home, '.claude', 'skills')
      : path.join(home, '.gemini', 'skills')
  return { kind: 'directory', clientId, skillsDir }
}

// ---------------------------------------------------------------------------
// Manifest I/O (single source of truth for install state of directory targets)
// ---------------------------------------------------------------------------

export function getManifestPath(storageDir: string): string {
  return path.join(storageDir, 'skills-installed.json')
}

function readManifestAt(storageDir: string): SkillsManifest {
  const manifestPath = getManifestPath(storageDir)
  try {
    if (!fs.existsSync(manifestPath)) return { records: [] }
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<SkillsManifest>
    return { records: Array.isArray(parsed.records) ? parsed.records : [] }
  } catch {
    // Corrupt manifest is treated as empty — manifest is regenerable via reinstall.
    return { records: [] }
  }
}

function writeManifestAt(storageDir: string, manifest: SkillsManifest): void {
  const manifestPath = getManifestPath(storageDir)
  const dir = path.dirname(manifestPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

function findRecord(
  manifest: SkillsManifest,
  client: SkillClientId,
  skillName: string
): InstalledSkillRecord | undefined {
  return manifest.records.find((r) => r.client === client && r.skillName === skillName)
}

function withoutRecord(
  manifest: SkillsManifest,
  client: SkillClientId,
  skillName: string
): SkillsManifest {
  return {
    records: manifest.records.filter(
      (r) => !(r.client === client && r.skillName === skillName)
    ),
  }
}

// ---------------------------------------------------------------------------
// Zip export (manual targets)
// ---------------------------------------------------------------------------

function zipDirectory(sourceDir: string, destZip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZip)
    const archive = archiver('zip', { zlib: { level: 9 } })
    output.on('close', () => resolve())
    archive.on('error', (err) => reject(err))
    archive.pipe(output)
    // Place files under `<skillName>/...` inside the zip so unzipping yields a
    // tidy named directory rather than loose files.
    archive.directory(sourceDir, path.basename(sourceDir))
    archive.finalize().catch(reject)
  })
}

// ---------------------------------------------------------------------------
// Module factory
// ---------------------------------------------------------------------------

export function createSkillsModule(config: SkillsModuleConfig): SkillsModule {
  const { repoRoot, storageDir } = config

  function listBundledSkills(): BundledSkill[] {
    const dir = getBundledSkillsDir(repoRoot)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        sourcePath: path.join(dir, entry.name),
      }))
      .filter((skill) => fs.existsSync(path.join(skill.sourcePath, 'SKILL.md')))
  }

  function getSkillTarget(clientId: SkillClientId): SkillTarget {
    return resolveSkillTarget(clientId, repoRoot)
  }

  function readManifest(): SkillsManifest {
    return readManifestAt(storageDir)
  }

  function listSkillsForClient(clientId: SkillClientId): SkillListEntry[] {
    const bundled = listBundledSkills()
    const manifest = readManifest()
    const currentVersion = app.getVersion()
    return bundled.map((skill) => {
      const record = findRecord(manifest, clientId, skill.name)
      let status: SkillInstallStatus = 'not-installed'
      if (record) {
        status = record.installedVersion === currentVersion ? 'installed' : 'installed-stale'
      }
      return {
        name: skill.name,
        status,
        installedVersion: record?.installedVersion,
        bundledVersion: currentVersion,
      }
    })
  }

  async function installSkill(
    clientId: SkillClientId,
    skillName: string
  ): Promise<InstallResult> {
    const target = getSkillTarget(clientId)
    if (target.kind === 'manual') {
      return exportSkillAsZip(skillName)
    }
    const bundled = listBundledSkills().find((s) => s.name === skillName)
    if (!bundled) {
      return { success: false, error: `Unknown skill: ${skillName}` }
    }
    try {
      if (!fs.existsSync(target.skillsDir)) {
        fs.mkdirSync(target.skillsDir, { recursive: true })
      }
      const dest = path.join(target.skillsDir, skillName)
      // Remove any existing copy so we get a clean replace (handles updates).
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true })
      }
      fs.cpSync(bundled.sourcePath, dest, { recursive: true })

      // Record install.
      const manifest = readManifest()
      const cleaned = withoutRecord(manifest, clientId, skillName)
      cleaned.records.push({
        client: clientId,
        skillName,
        installedVersion: app.getVersion(),
        installedAt: new Date().toISOString(),
      })
      writeManifestAt(storageDir, cleaned)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  function uninstallSkill(clientId: SkillClientId, skillName: string): InstallResult {
    const target = getSkillTarget(clientId)
    if (target.kind === 'manual') {
      // Nothing to uninstall — manual targets don't track install state.
      return { success: true }
    }
    try {
      const manifest = readManifest()
      const record = findRecord(manifest, clientId, skillName)
      if (!record) {
        // No record → don't touch the filesystem; might be a foreign skill.
        return { success: true }
      }
      const dest = path.join(target.skillsDir, skillName)
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true })
      }
      writeManifestAt(storageDir, withoutRecord(manifest, clientId, skillName))
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  async function installAll(clientId: SkillClientId): Promise<BulkResult> {
    const target = getSkillTarget(clientId)
    if (target.kind === 'manual') {
      return exportAllSkillsAsZips()
    }
    const errors: BulkResult['errors'] = []
    for (const skill of listBundledSkills()) {
      const result = await installSkill(clientId, skill.name)
      if (!result.success && !result.cancelled) {
        errors!.push({ skillName: skill.name, error: result.error ?? 'Unknown error' })
      }
    }
    return errors!.length ? { success: false, errors } : { success: true }
  }

  /**
   * Manual-target bulk export: one folder picker, write every bundled skill
   * as its own `.zip` into the chosen directory. Avoids popping a save
   * dialog per skill.
   */
  async function exportAllSkillsAsZips(): Promise<BulkResult> {
    const dialogResult = await dialog.showOpenDialog({
      title: 'Export Skills To Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      // Treat user cancel as success-with-no-action — matches the manual
      // single-skill cancellation contract.
      return { success: true }
    }
    const destDir = dialogResult.filePaths[0]
    const errors: BulkResult['errors'] = []
    const writtenPaths: string[] = []
    for (const skill of listBundledSkills()) {
      const destZip = path.join(destDir, `${skill.name}.zip`)
      try {
        await zipDirectory(skill.sourcePath, destZip)
        writtenPaths.push(destZip)
      } catch (err) {
        errors!.push({
          skillName: skill.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    // Reveal the first written zip — Finder opens to that folder.
    if (writtenPaths.length > 0) {
      shell.showItemInFolder(writtenPaths[0])
    }
    return errors!.length ? { success: false, errors } : { success: true }
  }

  function uninstallAll(clientId: SkillClientId): BulkResult {
    const errors: BulkResult['errors'] = []
    for (const skill of listBundledSkills()) {
      const result = uninstallSkill(clientId, skill.name)
      if (!result.success) {
        errors!.push({ skillName: skill.name, error: result.error ?? 'Unknown error' })
      }
    }
    return errors!.length ? { success: false, errors } : { success: true }
  }

  async function exportSkillAsZip(skillName: string): Promise<InstallResult> {
    const bundled = listBundledSkills().find((s) => s.name === skillName)
    if (!bundled) {
      return { success: false, error: `Unknown skill: ${skillName}` }
    }
    const dialogResult = await dialog.showSaveDialog({
      title: `Export Skill — ${skillName}`,
      defaultPath: `${skillName}.zip`,
      filters: [
        { name: 'Zip Archive', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, cancelled: true }
    }
    try {
      await zipDirectory(bundled.sourcePath, dialogResult.filePath)
      // Reveal the new file in Finder/Explorer so the user can drop it into
      // Claude Desktop's Capabilities UI in one motion.
      shell.showItemInFolder(dialogResult.filePath)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  function registerHandlers(clientId: SkillClientId): void {
    ipcMain.handle(`skills:${clientId}:list`, async () => listSkillsForClient(clientId))
    ipcMain.handle(`skills:${clientId}:target`, async () => getSkillTarget(clientId))
    ipcMain.handle(`skills:${clientId}:install`, async (_, skillName: string) =>
      installSkill(clientId, skillName)
    )
    ipcMain.handle(`skills:${clientId}:uninstall`, async (_, skillName: string) =>
      uninstallSkill(clientId, skillName)
    )
    ipcMain.handle(`skills:${clientId}:install-all`, async () => installAll(clientId))
    ipcMain.handle(`skills:${clientId}:uninstall-all`, async () => uninstallAll(clientId))
  }

  return {
    listBundledSkills,
    getSkillTarget,
    listSkillsForClient,
    readManifest,
    installSkill,
    uninstallSkill,
    installAll,
    uninstallAll,
    exportSkillAsZip,
    registerHandlers,
  }
}
