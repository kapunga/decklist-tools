import type { ReactNode } from 'react'
import { Settings2, Layers, Tag, Plug, Sparkles, Database, HardDrive } from 'lucide-react'

export type SettingsSection =
  | 'general'
  | 'sets'
  | 'roles'
  | 'mcp-server'
  | 'skills'
  | 'data'
  | 'cache'

interface SectionDef {
  id: SettingsSection
  label: string
  icon: ReactNode
}

const ICON_CLASS = 'w-4 h-4 shrink-0'

export const SETTINGS_SECTIONS: SectionDef[] = [
  { id: 'general', label: 'General', icon: <Settings2 className={ICON_CLASS} /> },
  { id: 'sets', label: 'Set Collection', icon: <Layers className={ICON_CLASS} /> },
  { id: 'roles', label: 'Roles', icon: <Tag className={ICON_CLASS} /> },
  { id: 'mcp-server', label: 'MCP Server', icon: <Plug className={ICON_CLASS} /> },
  { id: 'skills', label: 'Skills', icon: <Sparkles className={ICON_CLASS} /> },
  { id: 'data', label: 'Data', icon: <Database className={ICON_CLASS} /> },
  { id: 'cache', label: 'Cache', icon: <HardDrive className={ICON_CLASS} /> },
]

interface SettingsSidebarProps {
  active: SettingsSection
  onChange: (section: SettingsSection) => void
}

export function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  return (
    <aside
      className="flex flex-col shrink-0 border-r border-border/50"
      style={{ width: '220px', backgroundColor: 'var(--background)' }}
    >
      <nav className="flex flex-col gap-0.5 p-3">
        {SETTINGS_SECTIONS.map(section => (
          <SettingsNavRow
            key={section.id}
            label={section.label}
            icon={section.icon}
            isActive={section.id === active}
            onClick={() => onChange(section.id)}
          />
        ))}
      </nav>
    </aside>
  )
}

interface SettingsNavRowProps {
  label: string
  icon: ReactNode
  isActive: boolean
  onClick: () => void
}

function SettingsNavRow({ label, icon, isActive, onClick }: SettingsNavRowProps) {
  return (
    <button
      onClick={onClick}
      data-active={isActive ? 'true' : undefined}
      className="settings-sidebar-nav-row h-9 px-3 rounded-md flex items-center gap-3 text-left transition-colors hover:bg-accent/50"
      style={{
        color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
        backgroundColor: isActive ? 'var(--accent)' : 'transparent',
      }}
    >
      {icon}
      <span
        className="truncate"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: isActive ? 500 : 400,
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </span>
    </button>
  )
}
