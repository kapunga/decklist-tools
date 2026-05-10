import { useState, useCallback } from 'react'
import { SettingsSidebar, SETTINGS_SECTIONS, type SettingsSection } from '@/components/SettingsSidebar'
import { ThemeSettingsSection } from '@/components/ThemeSettingsSection'
import { DataManagementSection } from '@/components/DataManagementSection'
import { CacheSettingsSection } from '@/components/CacheSettingsSection'
import { SetCollectionPane } from '@/components/settings/SetCollectionPane'
import { RolesPane } from '@/components/settings/RolesPane'
import { IntegrationsPane } from '@/components/settings/IntegrationsPane'

function renderPane(section: SettingsSection) {
  switch (section) {
    case 'general':       return <ThemeSettingsSection />
    case 'sets':          return <SetCollectionPane />
    case 'roles':         return <RolesPane />
    case 'integrations':  return <IntegrationsPane />
    case 'data':          return <DataManagementSection />
    case 'cache':         return <CacheSettingsSection />
  }
}

function parseInitialSection(): SettingsSection {
  const param = new URLSearchParams(window.location.search).get('section')
  const match = SETTINGS_SECTIONS.find(s => s.id === param)
  return match?.id ?? 'general'
}

export function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>(parseInitialSection)

  const handleChange = useCallback((section: SettingsSection) => {
    setActive(section)
    void window.electronAPI.saveSettingsActiveSection(section)
  }, [])

  return (
    <div className="h-full flex overflow-hidden">
      <SettingsSidebar active={active} onChange={handleChange} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl px-8 py-6">
          {renderPane(active)}
        </div>
      </main>
    </div>
  )
}
