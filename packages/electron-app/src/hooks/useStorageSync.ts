import { useEffect } from 'react'

// Coalesce bursts of storage-change events (e.g. restoring a backup writes many
// deck files at once) into a single reload, so we don't fire loadData — and a
// re-render — per file.
const RELOAD_DEBOUNCE_MS = 200

export function useStorageSync(loadData: () => void | Promise<void>): void {
  useEffect(() => {
    void loadData()

    let timer: ReturnType<typeof setTimeout> | null = null
    window.electronAPI.onStorageChanged(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void loadData() }, RELOAD_DEBOUNCE_MS)
    })

    return () => {
      if (timer) clearTimeout(timer)
      window.electronAPI.removeStorageListener()
    }
  }, [loadData])
}
