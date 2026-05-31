import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SimpleCollapsible } from '@/components/CollapsibleSection'
import type { SkillListEntry, SkillTarget } from '@/vite-env'

interface SkillsIntegrationCardProps {
  clientId: string
  /** Display name of the target client, e.g. "Claude Code". */
  clientTitle: string
  /** One-line summary shown when at least one skill is installed. */
  connectedDescription: string
  /** One-line summary shown when nothing is installed. */
  disconnectedDescription: string
}

type BulkAction = 'install-all' | 'update-all' | 'uninstall-all' | 'export-all'

interface BulkButtonState {
  label: string
  action: BulkAction
  variant: 'default' | 'outline'
}

function summarizeStatus(skills: SkillListEntry[]): string {
  if (skills.length === 0) return 'No skills available'
  const installed = skills.filter((s) => s.status !== 'not-installed').length
  const stale = skills.filter((s) => s.status === 'installed-stale').length
  if (installed === 0) return `0 / ${skills.length} installed`
  if (stale > 0) return `${installed} / ${skills.length} installed · ${stale} update${stale === 1 ? '' : 's'} available`
  return `${installed} / ${skills.length} installed`
}

function chooseBulkAction(target: SkillTarget | null, skills: SkillListEntry[]): BulkButtonState {
  if (target?.kind === 'manual') {
    return { label: 'Save skills bundle…', action: 'export-all', variant: 'default' }
  }
  const installed = skills.filter((s) => s.status !== 'not-installed').length
  const stale = skills.filter((s) => s.status === 'installed-stale').length
  if (installed === 0) return { label: 'Install all', action: 'install-all', variant: 'default' }
  if (stale > 0) return { label: 'Update all', action: 'update-all', variant: 'default' }
  // All installed, all current.
  return { label: 'Uninstall all', action: 'uninstall-all', variant: 'outline' }
}

function statusBadge(status: SkillListEntry['status']): { label: string; className: string } {
  switch (status) {
    case 'installed':
      return { label: 'Installed', className: 'bg-green-500/15 text-green-600 dark:text-green-400' }
    case 'installed-stale':
      return { label: 'Update available', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' }
    case 'not-installed':
      return { label: 'Not installed', className: 'bg-muted text-muted-foreground' }
  }
}

export function SkillsIntegrationCard({
  clientId,
  clientTitle,
  connectedDescription,
  disconnectedDescription,
}: SkillsIntegrationCardProps) {
  const [skills, setSkills] = useState<SkillListEntry[]>([])
  const [target, setTarget] = useState<SkillTarget | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [list, tgt] = await Promise.all([
        window.electronAPI.listSkills(clientId),
        window.electronAPI.getSkillTarget(clientId),
      ])
      setSkills(list)
      setTarget(tgt)
    } catch (err) {
      console.error(`Failed to list skills for ${clientId}:`, err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const installedCount = skills.filter((s) => s.status !== 'not-installed').length
  const isManual = target?.kind === 'manual'
  const summary = summarizeStatus(skills)
  const bulkButton = chooseBulkAction(target, skills)

  const handleBulk = useCallback(async () => {
    setError(null)
    setBusyAction('bulk')
    try {
      if (bulkButton.action === 'uninstall-all') {
        const result = await window.electronAPI.uninstallAllSkills(clientId)
        if (!result.success) {
          setError(
            result.errors?.map((e) => `${e.skillName}: ${e.error}`).join('; ') ?? 'Uninstall failed'
          )
        }
      } else {
        // install-all, update-all, and export-all all map to the same IPC —
        // install replaces, and for manual targets the handler shows a folder
        // picker and writes zips.
        const result = await window.electronAPI.installAllSkills(clientId)
        if (!result.success) {
          setError(
            result.errors?.map((e) => `${e.skillName}: ${e.error}`).join('; ') ?? 'Install failed'
          )
        }
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setBusyAction(null)
    }
  }, [bulkButton.action, clientId, refresh])

  const handleSkillAction = useCallback(
    async (skill: SkillListEntry) => {
      setError(null)
      setBusyAction(skill.name)
      try {
        // For manual targets, every per-skill action is "export this one as zip".
        // For directory targets, installed → uninstall, otherwise install.
        const shouldUninstall = !isManual && skill.status !== 'not-installed' && skill.status !== 'installed-stale'
        const result = shouldUninstall
          ? await window.electronAPI.uninstallSkill(clientId, skill.name)
          : await window.electronAPI.installSkill(clientId, skill.name)
        if (!result.success && !result.cancelled) {
          setError(result.error ?? 'Operation failed')
        }
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setBusyAction(null)
      }
    },
    [clientId, isManual, refresh]
  )

  const skillButtonLabel = (skill: SkillListEntry): string => {
    if (isManual) return 'Save…'
    switch (skill.status) {
      case 'installed':
        return 'Uninstall'
      case 'installed-stale':
        return 'Update'
      case 'not-installed':
        return 'Install'
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">{clientTitle} — Skills</h2>
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                installedCount > 0 ? 'bg-green-500/20' : 'bg-muted'
              }`}
            >
              {installedCount > 0 ? (
                <Sparkles className="w-5 h-5 text-green-500" />
              ) : (
                <BookOpen className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="font-medium">{summary}</div>
              <p className="text-sm text-muted-foreground">
                {installedCount > 0 ? connectedDescription : disconnectedDescription}
              </p>
            </div>
          </div>
          <Button
            variant={bulkButton.variant}
            onClick={handleBulk}
            disabled={loading || busyAction !== null || skills.length === 0}
            className="gap-2"
          >
            {busyAction === 'bulk' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working…
              </>
            ) : (
              bulkButton.label
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {isManual && (
          <p className="mt-3 text-xs text-muted-foreground">
            Claude Desktop installs skills through its Capabilities UI. Save the bundle and drag the zip(s) into Claude Desktop.
          </p>
        )}

        {skills.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <SimpleCollapsible title="Per-skill controls" count={skills.length} defaultOpen={false}>
              <ul className="space-y-2 mt-2">
                {skills.map((skill) => {
                  const badge = statusBadge(skill.status)
                  return (
                    <li
                      key={skill.name}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm truncate">{skill.name}</span>
                        {!isManual && (
                          <span className={`text-xs px-2 py-0.5 rounded ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={skill.status === 'installed' && !isManual ? 'outline' : 'default'}
                        onClick={() => handleSkillAction(skill)}
                        disabled={busyAction !== null}
                      >
                        {busyAction === skill.name ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          skillButtonLabel(skill)
                        )}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </SimpleCollapsible>
          </div>
        )}
      </div>
    </section>
  )
}
