import { useCallback, useEffect, useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  SkillClientId,
  SkillInstallStatus,
  SkillListEntry,
  SkillTarget,
} from '@/vite-env'

// ---------------------------------------------------------------------------
// Layout
//
//   Skill            | Claude Desktop | Claude Code | Gemini CLI
//   -----------------+----------------+-------------+-----------
//   All (i)          |   [Save all…]  | [Install]   | [Install]
//   skill-foo (i)    |   [Save…]      | [Install]   | [Install]
//   skill-bar (i)    |   [Save…]      | [Update]    | [Installed]
//   ...
//
// Per-cell button label depends on (target.kind, status).
// Per-column "All" button label depends on (target.kind, aggregate status).
// ---------------------------------------------------------------------------

interface ClientColumnSpec {
  id: SkillClientId
  label: string
}

const COLUMNS: ClientColumnSpec[] = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'gemini-cli', label: 'Gemini CLI' },
  { id: 'manual', label: 'Export' },
]

interface PerClientState {
  target: SkillTarget
  skills: SkillListEntry[]
}

type ClientData = Record<SkillClientId, PerClientState>

interface CellAction {
  label: string
  variant: 'default' | 'outline' | 'ghost'
  action: 'install' | 'update' | 'uninstall' | 'save'
}

function cellAction(target: SkillTarget, status: SkillInstallStatus): CellAction {
  if (target.kind === 'manual') {
    return { label: 'Save…', variant: 'default', action: 'save' }
  }
  switch (status) {
    case 'installed':
      return { label: 'Uninstall', variant: 'outline', action: 'uninstall' }
    case 'installed-stale':
      return { label: 'Update', variant: 'default', action: 'update' }
    case 'not-installed':
      return { label: 'Install', variant: 'default', action: 'install' }
  }
}

function bulkAction(target: SkillTarget, skills: SkillListEntry[]): CellAction {
  if (target.kind === 'manual') {
    return { label: 'Save all…', variant: 'default', action: 'save' }
  }
  const installed = skills.filter((s) => s.status !== 'not-installed').length
  const stale = skills.filter((s) => s.status === 'installed-stale').length
  if (installed === 0) return { label: 'Install all', variant: 'default', action: 'install' }
  if (stale > 0) return { label: 'Update all', variant: 'default', action: 'update' }
  return { label: 'Uninstall all', variant: 'outline', action: 'uninstall' }
}

async function fetchClientData(clientId: SkillClientId): Promise<PerClientState> {
  const [skills, target] = await Promise.all([
    window.electronAPI.listSkills(clientId),
    window.electronAPI.getSkillTarget(clientId),
  ])
  return { target, skills }
}

export function SkillsTable() {
  const [data, setData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  /** Key: `${clientId}:${skillName | "*"}`. Single busy slot at a time. */
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const entries = await Promise.all(
        COLUMNS.map(async (col) => [col.id, await fetchClientData(col.id)] as const)
      )
      setData(Object.fromEntries(entries) as ClientData)
    } catch (err) {
      console.error('Failed to load skills:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runCell = useCallback(
    async (clientId: SkillClientId, skillName: string, action: CellAction['action']) => {
      const key = `${clientId}:${skillName}`
      setBusyKey(key)
      setError(null)
      try {
        const result =
          action === 'uninstall'
            ? await window.electronAPI.uninstallSkill(clientId, skillName)
            : await window.electronAPI.installSkill(clientId, skillName)
        if (!result.success && !result.cancelled) {
          setError(`${skillName} (${clientId}): ${result.error ?? 'Operation failed'}`)
        }
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setBusyKey(null)
      }
    },
    [refresh]
  )

  const runBulk = useCallback(
    async (clientId: SkillClientId, action: CellAction['action']) => {
      const key = `${clientId}:*`
      setBusyKey(key)
      setError(null)
      try {
        const result =
          action === 'uninstall'
            ? await window.electronAPI.uninstallAllSkills(clientId)
            : await window.electronAPI.installAllSkills(clientId)
        if (!result.success) {
          setError(
            result.errors?.map((e) => `${e.skillName}: ${e.error}`).join('; ') ??
              `Bulk ${action} failed`
          )
        }
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setBusyKey(null)
      }
    },
    [refresh]
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading skills…
      </div>
    )
  }

  if (!data) {
    return <div className="text-sm text-destructive">Failed to load skills.</div>
  }

  // listBundledSkills is identical across clients, so any non-empty column works.
  const skillNames = (data['claude-code']?.skills ?? data['gemini-cli']?.skills ?? data['manual']?.skills)
    .map((s) => s.name)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left font-medium py-2 pr-4">Skill</th>
                {COLUMNS.map((col) => (
                  <th key={col.id} className="text-left font-medium py-2 px-4 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <BulkRow data={data} busyKey={busyKey} onRun={runBulk} />
              {skillNames.map((name) => (
                <SkillRow
                  key={name}
                  name={name}
                  data={data}
                  busyKey={busyKey}
                  onRun={runCell}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground font-medium">About Export.</strong>{' '}
            <em>Save…</em> writes a SKILL.md bundle as a <code>.zip</code> at a location you choose.
            Use it with any harness that reads SKILL.md bundles.
          </p>
          <p>
            For Claude Desktop, open the app's Capabilities settings and upload the zip there.
            For other tools, consult that tool's docs for where SKILL.md bundles live.
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

interface BulkRowProps {
  data: ClientData
  busyKey: string | null
  onRun: (clientId: SkillClientId, action: CellAction['action']) => void
}

function BulkRow({ data, busyKey, onRun }: BulkRowProps) {
  return (
    <tr className="border-b border-border/60 bg-muted/20">
      <td className="py-2 pr-4 font-medium">All skills</td>
      {COLUMNS.map((col) => {
        const state = data[col.id]
        const action = bulkAction(state.target, state.skills)
        const key = `${col.id}:*`
        const busy = busyKey === key
        return (
          <td key={col.id} className="py-2 px-4">
            <Button
              size="sm"
              variant={action.variant}
              disabled={busyKey !== null || state.skills.length === 0}
              onClick={() => onRun(col.id, action.action)}
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
            </Button>
          </td>
        )
      })}
    </tr>
  )
}

interface SkillRowProps {
  name: string
  data: ClientData
  busyKey: string | null
  onRun: (clientId: SkillClientId, skillName: string, action: CellAction['action']) => void
}

function SkillRow({ name, data, busyKey, onRun }: SkillRowProps) {
  // Description is identical across clients — pick the first one that has it.
  const description =
    COLUMNS.map((col) => data[col.id].skills.find((s) => s.name === name)?.description).find(
      (d) => d !== undefined
    ) ?? ''

  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className="py-2 pr-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs truncate">{name}</span>
          {description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${name}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm whitespace-normal">
                {description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      {COLUMNS.map((col) => {
        const state = data[col.id]
        const skill = state.skills.find((s) => s.name === name)
        if (!skill) {
          return (
            <td key={col.id} className="py-2 px-4 text-xs text-muted-foreground">
              —
            </td>
          )
        }
        const action = cellAction(state.target, skill.status)
        const key = `${col.id}:${name}`
        const busy = busyKey === key
        return (
          <td key={col.id} className="py-2 px-4">
            <Button
              size="sm"
              variant={action.variant}
              disabled={busyKey !== null}
              onClick={() => onRun(col.id, name, action.action)}
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
            </Button>
          </td>
        )
      })}
    </tr>
  )
}
